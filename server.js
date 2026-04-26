const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const multer = require('multer');

const app = express();
const PORT = 3000;


const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  // Single-computer default (override via DB_PASSWORD env var if you want)
  password: process.env.DB_PASSWORD || 'yuyutshu',
  database: process.env.DB_NAME || 'leafcure',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

let pool;

function getDbErrorMessage(err) {
  switch (err && err.code) {
    case 'ER_ACCESS_DENIED_ERROR':
      return 'Database authentication failed. Check DB_USER and DB_PASSWORD in your environment.';
    case 'ER_BAD_DB_ERROR':
      return 'Database not found. Create it first or set DB_NAME correctly.';
    case 'ER_NO_SUCH_TABLE':
      return 'Required tables are missing. Run schema.sql in your database.';
    case 'ECONNREFUSED':
      return 'Cannot connect to MySQL. Ensure MySQL is running and DB_HOST/DB_PORT are correct.';
    default:
      return 'Internal server error.';
  }
}

async function initDb() {
  if (!pool) {
    pool = await mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

function mapUser(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    joined: row.joined_at,
    scanCount: row.scan_count,
    diseasedCount: row.diseased_count,
  };
}

// Store a single scan (leaf + diagnosis) linked to a user
app.post('/api/scans', async (req, res) => {
  const { userId, userName, email, leafScanned, diagnosis } = req.body;

  if (!userId || !userName || !email || !leafScanned || !diagnosis) {
    return res.status(400).json({ message: 'userId, userName, email, leafScanned, and diagnosis are required.' });
  }

  try {
    const db = await initDb();

    await db.query(
      'INSERT INTO scans (user_id, user_name, email, leaf_scanned, diagnosis) VALUES (?, ?, ?, ?, ?)',
      [userId, userName, email, leafScanned, diagnosis]
    );

    return res.status(201).json({ message: 'Scan saved successfully.' });
  } catch (err) {
    console.error('Save scan error:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const db = await initDb();
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

function runPythonPredict({ pythonCmd, scriptPath, checkpointPath, imagePath }) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonCmd, [scriptPath, '--checkpoint', checkpointPath, '--image', imagePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        const err = new Error(stderr || `Predict process exited with code ${code}`);
        err.code = code;
        err.stderr = stderr;
        err.stdout = stdout;
        return reject(err);
      }

      try {
        const parsed = JSON.parse(stdout);
        return resolve(parsed);
      } catch (e) {
        const err = new Error(`Failed to parse predictor output as JSON. Raw output: ${stdout.slice(0, 500)}`);
        err.stderr = stderr;
        return reject(err);
      }
    });
  });
}

// Run model inference on uploaded leaf image
app.post('/api/detect', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required (form field name: image).' });
    }

    const venvPython = process.platform === 'win32'
      ? path.join(__dirname, '.venv', 'Scripts', 'python.exe')
      : path.join(__dirname, '.venv', 'bin', 'python');

    const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python';
    const scriptPath = path.join(__dirname, 'ml', 'predict.py');

    const modelDir = path.join(__dirname, 'models');
    const candidates = [
      path.join(modelDir, 'tomato_model_v3_final.pth'),
      path.join(modelDir, 'best_v3.pth'),
    ];

    const checkpointPath = candidates.find((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    });

    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({
        message: 'Predictor script not found on server.',
        detail: `Missing: ${scriptPath}`,
      });
    }
    if (!checkpointPath) {
      return res.status(500).json({
        message:
          'Model file not found. Export your trained .pth from Colab and place it on this computer, then set MODEL_PATH if needed.',
        expectedPaths: candidates,
      });
    }

    const extByMime = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extByMime[req.file.mimetype] || '.img';
    const tmpName = `leafcure_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    const tmpPath = path.join(os.tmpdir(), tmpName);
    await fs.promises.writeFile(tmpPath, req.file.buffer);

    try {
      const pred = await runPythonPredict({
        pythonCmd,
        scriptPath,
        checkpointPath,
        imagePath: tmpPath,
      });
      return res.json(pred);
    } finally {
      fs.promises.unlink(tmpPath).catch(() => {});
    }
  } catch (err) {
    console.error('Detect error:', err.message);
    return res.status(500).json({ message: 'Internal server error.', detail: err.message });
  }
});

app.post('/api/register', async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;

  if (!firstName || !lastName) {
    return res.status(400).json({ message: 'Please enter your full name.' });
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return res
      .status(400)
      .json({ message: 'Please enter a valid email address (e.g. user@example.com).' });
  }
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      message:
        'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.',
    });
  }
  if (!role) {
    return res.status(400).json({ message: 'Please select your role.' });
  }

  try {
    const db = await initDb();

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [firstName, lastName, email, passwordHash, role]
    );

    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const user = rows[0];

    return res.status(201).json(mapUser(user));
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ message: getDbErrorMessage(err) });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return res
      .status(400)
      .json({ message: 'Please enter a valid email address (e.g. user@example.com).' });
  }
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      message:
        'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.',
    });
  }

  try {
    const db = await initDb();

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    return res.json(mapUser(user));
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Admin login (only users with role = 'admin')
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return res
      .status(400)
      .json({ message: 'Please enter a valid email address (e.g. admin@example.com).' });
  }
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      message:
        'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.',
    });
  }

  try {
    const db = await initDb();

    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND role = "admin"', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid admin credentials.' });
    }

    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(400).json({ message: 'Invalid admin credentials.' });
    }

    return res.json(mapUser(admin));
  } catch (err) {
    console.error('Admin login error:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Admin summary and listings (basic admin rights)
app.get('/api/admin/summary', async (req, res) => {
  try {
    const db = await initDb();
    const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) AS totalUsers FROM users');
    const [[{ totalScans }]] = await db.query('SELECT COUNT(*) AS totalScans FROM scans');
    const [[{ diseasedScans }]] = await db.query(
      'SELECT COUNT(*) AS diseasedScans FROM scans WHERE diagnosis <> "Healthy"'
    );

    const [latestRows] = await db.query(
      'SELECT id, user_name AS userName, diagnosis, created_at AS createdAt FROM scans ORDER BY created_at DESC LIMIT 1'
    );
    const latestScan = latestRows && latestRows.length > 0 ? latestRows[0] : null;

    res.json({ totalUsers, totalScans, diseasedScans, latestScan });
  } catch (err) {
    console.error('Admin summary error:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const db = await initDb();
    const [rows] = await db.query(
      'SELECT id, first_name, last_name, email, role, joined_at FROM users ORDER BY joined_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Admin users error:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.get('/api/admin/scans', async (req, res) => {
  try {
    const db = await initDb();
    const [rows] = await db.query(
      'SELECT id, user_id, user_name, email, leaf_scanned, diagnosis, created_at FROM scans ORDER BY created_at DESC LIMIT 200'
    );
    res.json(rows);
  } catch (err) {
    console.error('Admin scans error:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Update a user's role (admin right)
app.patch('/api/admin/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const allowedRoles = ['admin', 'farmer', 'researcher', 'student', 'agronomist', 'other'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role value.' });
  }

  try {
    const db = await initDb();
    const [result] = await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ message: 'Role updated successfully.' });
  } catch (err) {
    console.error('Admin update role error:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Delete a user (and their scans via FK cascade)
app.delete('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await initDb();
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Admin delete user error:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Delete a single scan
app.delete('/api/admin/scans/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await initDb();
    const [result] = await db.query('DELETE FROM scans WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Scan not found.' });
    }
    res.json({ message: 'Scan deleted successfully.' });
  } catch (err) {
    console.error('Admin delete scan error:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`starting on http://localhost:${PORT}`);
  console.log(
    `DB config -> host: ${dbConfig.host}, port: ${dbConfig.port}, user: ${dbConfig.user}, database: ${dbConfig.database}`
  );
});
