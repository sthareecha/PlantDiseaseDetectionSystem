const API_BASE_URL = window.location.origin.startsWith('http')
  ? window.location.origin
  : 'http://localhost:3000';

// App state
let currentUser = null;
let scanHistory = [];
let currentResult = null;
let selectedFile = null;
let selectedFileDataURL = null;
window.addEventListener('load', () => {
  const userData = localStorage.getItem('lc_current_user');
  if (!userData) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = JSON.parse(userData);
  scanHistory = JSON.parse(localStorage.getItem(`lc_history_${currentUser.email}`) || '[]');

  initUI();
  loadDashboard();
  loadHistory();
  loadProfile();
});

function initUI() {
  const initials = getInitials(currentUser.firstName, currentUser.lastName);
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('sidebar-name').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
  document.getElementById('sidebar-role').textContent = currentUser.role || 'Farmer';
  document.getElementById('topbar-avatar').textContent = initials;

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const el = document.getElementById('welcome-heading');
  if (el) el.textContent = `${greeting}, ${currentUser.firstName}`;
}

function getInitials(first, last) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || 'U';
}

// ===== NAVIGATION =====
function showPage(name, navEl) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById('page-' + name);
  if (section) section.classList.add('active');
  if (navEl) navEl.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    detect: 'Detect Disease',
    history: 'Scan History',
    profile: 'My Profile'
  };
  const topTitle = document.getElementById('topbar-title');
  if (topTitle) topTitle.textContent = titles[name] || name;

  closeSidebar();

  if (name === 'history') loadHistory();
  if (name === 'dashboard') loadDashboard();
}

// ===== SIDEBAR =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('active');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// ===== DASHBOARD =====
function loadDashboard() {
  const total    = scanHistory.length;
  const diseased = scanHistory.filter(s => s.status === 'diseased').length;
  const healthy  = total - diseased;

  animateCount('stat-total', total);
  animateCount('stat-diseased', diseased);
  animateCount('stat-healthy', healthy);

  const pct = total > 0 ? Math.round((diseased / total) * 100) : 0;
  document.getElementById('stat-disease-pct').textContent = `${pct}% of scans`;
  const hpct = total > 0 ? Math.round((healthy / total) * 100) : 0;
  document.getElementById('stat-healthy-pct').textContent = `${hpct}% healthy`;

  renderRecentScans();
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const step = Math.ceil(target / 20);
  const interval = setInterval(() => {
    start = Math.min(start + step, target);
    el.textContent = start;
    if (start >= target) clearInterval(interval);
  }, 40);
}

function renderRecentScans() {
  const wrap = document.getElementById('recent-scans-wrap');
  if (!wrap) return;

  const recent = [...scanHistory].reverse().slice(0, 5);

  if (recent.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <h3>No scans yet</h3>
        <p>Upload a leaf image to get started.</p>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <table class="recent-scans-table">
      <thead>
        <tr>
          <th>Disease</th>
          <th>Confidence</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${recent.map(s => `
          <tr>
            <td style="font-weight: 500;">${s.diseaseName}</td>
            <td>${s.confidence}%</td>
            <td><span class="badge badge-${s.status === 'healthy' ? 'green' : 'brown'}">${s.status}</span></td>
            <td style="color: var(--text-muted); font-size: 0.82rem;">${formatDate(s.date)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

// ===== FILE UPLOAD =====
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  processFile(file);
}

const uploadZone = document.getElementById('upload-zone');
if (uploadZone) {
  uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  });
}

function processFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please upload an image file (JPG, PNG, WEBP).', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('File size must be under 10MB.', 'error');
    return;
  }

  selectedFile = file;

  const reader = new FileReader();
  reader.onload = e => {
    selectedFileDataURL = e.target.result;
    const preview = document.getElementById('upload-preview');
    preview.src = e.target.result;
    preview.style.display = 'block';

    const nameEl = document.getElementById('upload-filename');
    nameEl.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    nameEl.style.display = 'block';

    document.getElementById('detect-btn').disabled = false;

    // Reset result
    document.getElementById('result-placeholder').classList.remove('hidden');
    document.getElementById('result-output').classList.add('hidden');
    document.getElementById('result-analyzing').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

// ===== DETECTION =====
function runDetection() {
  if (!selectedFile) return;

  currentResult = null;
  document.getElementById('result-placeholder').classList.add('hidden');
  document.getElementById('result-output').classList.add('hidden');
  document.getElementById('result-analyzing').classList.remove('hidden');
  document.getElementById('detect-btn').disabled = true;

  const form = new FormData();
  form.append('image', selectedFile);

  fetch(`${API_BASE_URL}/api/detect`, {
    method: 'POST',
    body: form
  })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Detection failed.');
      }
      return data;
    })
    .then(pred => {
      const label = pred.label;
      const confidence = Math.max(0, Math.min(100, Math.round(Number(pred.confidence) || 0)));

      const diseaseKey = (typeof MODEL_CLASS_TO_KEY === 'object' && MODEL_CLASS_TO_KEY[label])
        ? MODEL_CLASS_TO_KEY[label]
        : null;

      const disease = diseaseKey && DISEASES[diseaseKey]
        ? DISEASES[diseaseKey]
        : {
            name: label || 'Unknown',
            scientific: 'Unknown',
            status: 'diseased',
            severity: 'Unknown',
            symptoms: ['No details available for this class label in the UI metadata.'],
            treatment: [{ title: 'N/A', body: 'No treatment details available.' }]
          };

      const recommendations = buildRecommendations({ diseaseKey, confidence });

      currentResult = {
        id: Date.now(),
        diseaseKey: diseaseKey || 'unknown',
        diseaseName: disease.name,
        scientific: disease.scientific,
        confidence,
        status: disease.status,
        severity: disease.severity,
        symptoms: disease.symptoms,
        treatment: recommendations,
        date: new Date().toISOString(),
        imageData: selectedFileDataURL,
        modelLabel: label,
        top: pred.top || []
      };

      showResult(currentResult);
    })
    .catch(err => {
      showToast(err.message || 'Detection failed.', 'error');
      document.getElementById('result-analyzing').classList.add('hidden');
      document.getElementById('result-placeholder').classList.remove('hidden');
    })
    .finally(() => {
      document.getElementById('detect-btn').disabled = false;
    });
}

function showResult(result, options = {}) {
  document.getElementById('result-analyzing').classList.add('hidden');
  document.getElementById('result-output').classList.remove('hidden');

  const badge = document.getElementById('result-status-badge');
  badge.textContent = result.status === 'healthy' ? 'Healthy' : `Disease Detected`;
  badge.className = `badge badge-${result.status === 'healthy' ? 'green' : 'brown'}`;

  document.getElementById('result-disease-name').textContent = result.diseaseName;
  document.getElementById('result-scientific').textContent = result.scientific;
  document.getElementById('result-confidence').textContent = `${result.confidence}%`;
  document.getElementById('result-timestamp').textContent = formatDate(result.date);

  setTimeout(() => {
    document.getElementById('confidence-fill').style.width = `${result.confidence}%`;
  }, 100);

  document.getElementById('result-symptoms').innerHTML = result.symptoms.map(s => `
    <div class="symptom-item">
      <div class="symptom-dot"></div>
      <span>${s}</span>
    </div>`).join('');

  document.getElementById('result-treatment').innerHTML = result.treatment.map(t => `
    <div class="treatment-item">
      <strong>${t.title}</strong>
      ${t.body}
    </div>`).join('');

  const saveBtn = document.querySelector('#result-output [onclick="saveResult()"]');
  if (saveBtn) {
    const readOnly = !!options.readOnly;
    saveBtn.disabled = readOnly;
    saveBtn.textContent = readOnly ? 'Saved' : 'Save to History';
  }
}

function normalizeText(str) {
  return String(str ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function findNavItemByLabel(label) {
  const target = normalizeText(label);
  const items = Array.from(document.querySelectorAll('.sidebar-nav .nav-item'));
  return items.find(el => normalizeText(el.textContent) === target) || null;
}

function buildRecommendations({ diseaseKey, confidence }) {
  const SIMPLE_RECOMMENDATIONS = {
    healthy: [
      'Keep checking the plant every week.',
      'Water at the base (do not wet leaves).',
      'Keep the area clean (remove old leaves).'
    ],
    early_blight: [
      'Remove bad leaves.',
      'Keep leaves dry (water at the base).',
      'Use a tomato fungicide if it spreads.'
    ],
    late_blight: [
      'Act fast: remove very sick leaves/plant.',
      'Keep leaves dry and improve airflow.',
      'Use a late blight fungicide if available.'
    ],
    leaf_mold: [
      'Lower humidity (more airflow).',
      'Remove bad leaves.',
      'Use a tomato fungicide if needed.'
    ],
    septoria_leaf_spot: [
      'Remove the lowest spotted leaves.',
      'Mulch and water at the base.',
      'Use a tomato fungicide if it spreads.'
    ],
    bacterial_spot: [
      'Do not wet leaves (use drip/bottom watering).',
      'Remove bad leaves and clean tools.',
      'Copper spray can help slow it down.'
    ],
    spider_mites: [
      'Check under leaves for tiny mites/webs.',
      'Rinse leaf undersides with water.',
      'Use soap/oil spray or a miticide if severe.'
    ],
    target_spot: [
      'Remove bad leaves and improve airflow.',
      'Keep leaves dry (water at the base).',
      'Use a tomato fungicide if it spreads.'
    ],
    mosaic_virus: [
      'There is no cure.',
      'Remove the sick plant to protect others.',
      'Clean hands and tools.'
    ],
    yellow_leaf_curl: [
      'There is no cure.',
      'Remove the sick plant early.',
      'Control whiteflies (sticky traps/net/spray).'
    ],
  };

  const tips = SIMPLE_RECOMMENDATIONS[diseaseKey] || null;
  const lines = [];

  if (!tips) {
    lines.push('Take a clearer photo and scan again.');
    lines.push('If the plant gets worse, ask an expert.');
  } else {
    lines.push(...tips);
  }

  if (Number(confidence) < 40) {
    lines.unshift('Not sure: take another photo and scan again.');
  }

  lines.push('Read the label before any spray.');

  const body = `<ul>${lines.map(t => `<li>${t}</li>`).join('')}</ul>`;
  return [{ title: 'Recommendation', body }];
}

function saveResult() {
  if (!currentResult) return;
  scanHistory.push(currentResult);
  localStorage.setItem(`lc_history_${currentUser.email}`, JSON.stringify(scanHistory));

  currentUser.scanCount = (currentUser.scanCount || 0) + 1;
  if (currentResult.status === 'diseased') {
    currentUser.diseasedCount = (currentUser.diseasedCount || 0) + 1;
  }
  localStorage.setItem('lc_current_user', JSON.stringify(currentUser));

   // Also persist this scan to MySQL via backend API
   try {
     const userName = `${(currentUser.firstName || '').trim()} ${(currentUser.lastName || '').trim()}`.trim() || currentUser.email;
     const leafScanned = selectedFile ? selectedFile.name : 'Tomato leaf';

     if (currentUser.id) {
       fetch(`${API_BASE_URL}/api/scans`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           userId: currentUser.id,
           userName,
           email: currentUser.email,
           leafScanned,
           diagnosis: currentResult.diseaseName
         })
       })
         .then(res => res.json().catch(() => ({})))
         .then(data => {
           if (!data || !data.message) {
             console.log('Scan saved (no message returned).');
           }
         })
         .catch(err => {
           console.error('Error saving scan to database:', err);
         });
     }
   } catch (e) {
     console.error('Unexpected error while sending scan to API:', e);
   }

  showToast('Scan saved to your history.', 'success');
  loadDashboard();
  loadProfile();
  currentResult = null;

  document.querySelector('[onclick*="detect"]')?.classList.remove('active');
}

function resetDetection() {
  selectedFile = null;
  selectedFileDataURL = null;
  currentResult = null;
  document.getElementById('leaf-file-input').value = '';
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('upload-filename').style.display = 'none';
  document.getElementById('detect-btn').disabled = true;
  document.getElementById('result-placeholder').classList.remove('hidden');
  document.getElementById('result-output').classList.add('hidden');
  document.getElementById('result-analyzing').classList.add('hidden');
  document.getElementById('confidence-fill').style.width = '0%';

  const saveBtn = document.querySelector('#result-output [onclick="saveResult()"]');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save to History';
  }
}

// ===== HISTORY =====
function loadHistory() {
  filterHistory();
}

function filterHistory() {
  const search = (document.getElementById('history-search')?.value || '').toLowerCase();
  const status = document.getElementById('history-filter-status')?.value || '';
  const sort   = document.getElementById('history-filter-sort')?.value || 'newest';

  let filtered = [...scanHistory];

  if (search) filtered = filtered.filter(s => s.diseaseName.toLowerCase().includes(search));
  if (status) filtered = filtered.filter(s => s.status === status);

  filtered.sort((a, b) => sort === 'newest'
    ? new Date(b.date) - new Date(a.date)
    : new Date(a.date) - new Date(b.date));

  const grid = document.getElementById('history-grid');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <h3>No scans found</h3>
        <p>Try adjusting your search or filters.</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(s => `
    <div class="history-card" onclick="viewHistoryItem(${s.id})">
      <div class="history-card-img">
        ${s.imageData
          ? `<img src="${s.imageData}" alt="${s.diseaseName}" />`
          : `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
               <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
               <circle cx="8.5" cy="8.5" r="1.5"/>
               <polyline points="21 15 16 10 5 21"/>
             </svg>`}
      </div>
      <div class="history-card-body">
        <div class="history-card-title">${s.diseaseName}</div>
        <div class="history-card-meta">
          <span class="badge badge-${s.status === 'healthy' ? 'green' : 'brown'}">${s.status}</span>
          <span>${s.confidence}% confidence</span>
        </div>
        <p style="font-size: 0.8rem; color: var(--text-muted);">${s.scientific}</p>
      </div>
      <div class="history-card-footer">
        <span style="font-size: 0.78rem; color: var(--text-muted);">${formatDate(s.date)}</span>
        <div style="display: flex; gap: 4px;">
          <button class="icon-btn" title="View details" onclick="viewHistoryItem(${s.id}); event.stopPropagation();">
            <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="icon-btn delete" title="Delete" onclick="deleteScan(${s.id}); event.stopPropagation();">
            <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>`).join('');
}

function viewHistoryItem(id) {
  const scan = scanHistory.find(s => s.id === id);
  if (!scan) return;

  currentResult = null;
  showPage('detect', findNavItemByLabel('Detect Disease'));

  setTimeout(() => {
    if (scan.imageData) {
      const preview = document.getElementById('upload-preview');
      preview.src = scan.imageData;
      preview.style.display = 'block';

      const nameEl = document.getElementById('upload-filename');
      if (nameEl) {
        nameEl.textContent = `Viewing saved scan (${formatDate(scan.date)})`;
        nameEl.style.display = 'block';
      }
    }
    document.getElementById('result-placeholder').classList.add('hidden');
    document.getElementById('result-output').classList.remove('hidden');
    document.getElementById('result-analyzing').classList.add('hidden');

    const diseaseKey = (scan.diseaseKey && DISEASES[scan.diseaseKey])
      ? scan.diseaseKey
      : (scan.modelLabel && MODEL_CLASS_TO_KEY[scan.modelLabel])
        ? MODEL_CLASS_TO_KEY[scan.modelLabel]
        : null;

    const disease = diseaseKey && DISEASES[diseaseKey]
      ? DISEASES[diseaseKey]
      : {
          name: scan.diseaseName || scan.modelLabel || 'Unknown',
          scientific: scan.scientific || 'Unknown',
          status: scan.status || 'diseased',
          severity: scan.severity || 'Unknown',
          symptoms: Array.isArray(scan.symptoms) ? scan.symptoms : ['No details available.'],
          treatment: [{ title: 'N/A', body: 'No treatment details available.' }]
        };

    const recommendations = buildRecommendations({ diseaseKey, confidence: scan.confidence });

    showResult({
      ...scan,
      diseaseKey: diseaseKey || scan.diseaseKey || 'unknown',
      diseaseName: disease.name,
      scientific: disease.scientific,
      status: disease.status,
      severity: disease.severity,
      symptoms: disease.symptoms,
      treatment: recommendations,
    }, { readOnly: true });

    document.getElementById('result-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function deleteScan(id) {
  scanHistory = scanHistory.filter(s => s.id !== id);
  localStorage.setItem(`lc_history_${currentUser.email}`, JSON.stringify(scanHistory));
  loadHistory();
  loadDashboard();
  showToast('Scan deleted.', 'success');
}

function confirmClearHistory() {
  document.getElementById('clear-history-modal').classList.remove('hidden');
}

function clearHistory() {
  scanHistory = [];
  localStorage.setItem(`lc_history_${currentUser.email}`, JSON.stringify(scanHistory));
  closeModal('clear-history-modal');
  loadHistory();
  loadDashboard();
  showToast('Scan history cleared.', 'success');
}

// ===== PROFILE =====
function loadProfile() {
  const u = currentUser;
  const initials = getInitials(u.firstName, u.lastName);

  document.getElementById('profile-avatar-large').textContent = initials;
  document.getElementById('profile-display-name').textContent = `${u.firstName} ${u.lastName}`;
  document.getElementById('profile-display-email').textContent = u.email;
  document.getElementById('profile-display-role').textContent = u.role || 'Farmer';

  document.getElementById('p-firstname').value  = u.firstName || '';
  document.getElementById('p-lastname').value   = u.lastName  || '';
  document.getElementById('p-email').value      = u.email     || '';
  document.getElementById('p-phone').value      = u.phone     || '';
  document.getElementById('p-location').value   = u.location  || '';
  document.getElementById('p-bio').value        = u.bio       || '';

  const roleEl = document.getElementById('p-role');
  if (roleEl) roleEl.value = u.role || 'farmer';

  const total    = scanHistory.length;
  const diseased = scanHistory.filter(s => s.status === 'diseased').length;
  const healthy  = total - diseased;

  document.getElementById('ps-total').textContent    = total;
  document.getElementById('ps-diseased').textContent = diseased;
  document.getElementById('ps-healthy').textContent  = healthy;
}

function saveProfile() {
  const firstName = document.getElementById('p-firstname').value.trim();
  const lastName  = document.getElementById('p-lastname').value.trim();
  const email     = document.getElementById('p-email').value.trim();
  const phone     = document.getElementById('p-phone').value.trim();
  const location  = document.getElementById('p-location').value.trim();
  const role      = document.getElementById('p-role').value;
  const bio       = document.getElementById('p-bio').value.trim();

  if (!firstName || !lastName) { showToast('Name fields cannot be empty.', 'error'); return; }
  if (!email || !/\S+@\S+\.\S+/.test(email)) { showToast('Enter a valid email address.', 'error'); return; }

  currentUser = { ...currentUser, firstName, lastName, email, phone, location, role, bio };
  localStorage.setItem('lc_current_user', JSON.stringify(currentUser));

  initUI();
  loadProfile();
  showToast('Profile updated successfully.', 'success');
}

function resetProfileForm() {
  loadProfile();
  showToast('Changes discarded.', 'success');
}

function handleAvatarChange(e) {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = ev => {
    // For simplicity, show initials still but could use as img
    showToast('Profile photo updated.', 'success');
  };
  reader.readAsDataURL(file);
}

// ===== ACCOUNT ACTIONS =====
function confirmDeleteAccount() {
  document.getElementById('delete-modal').classList.remove('hidden');
}

function deleteAccount() {
  localStorage.removeItem('lc_current_user');
  localStorage.removeItem('lc_remember');
  localStorage.removeItem(`lc_history_${currentUser.email}`);
  window.location.href = 'login.html';
}

function handleLogout() {
  localStorage.removeItem('lc_current_user');
  localStorage.removeItem('lc_remember');
  window.location.href = 'login.html';
}

// ===== MODALS =====
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  }
});

// ===== TOAST =====
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${type === 'error' ? '#c0392b' : 'var(--green-mid)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${type === 'error'
        ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
        : '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}
    </svg>
    <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ===== HELPERS =====
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
