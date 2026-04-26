const API_BASE_URL = window.location.origin.startsWith('http')
  ? window.location.origin
  : 'http://localhost:3000';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function toggleAdminPassword(btn) {
  const input = document.getElementById('admin-password');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = `
      <svg class="eye-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>`;
  } else {
    input.type = 'password';
    btn.innerHTML = `
      <svg class="eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`;
  }
}

function handleAdminLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const errorEl = document.getElementById('admin-login-error');
  const btn = document.getElementById('admin-login-btn');

  errorEl.classList.add('hidden');

  if (!email || !password) {
    errorEl.textContent = 'Please enter your admin email and password.';
    errorEl.classList.remove('hidden');
    return;
  }

  if (!EMAIL_REGEX.test(email)) {
    errorEl.textContent = 'Please enter a valid admin email (e.g. admin@example.com).';
    errorEl.classList.remove('hidden');
    return;
  }

  if (!PASSWORD_REGEX.test(password)) {
    errorEl.textContent = 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.';
    errorEl.classList.remove('hidden');
    return;
  }

  btn.querySelector('.btn-text').textContent = 'Signing in...';
  btn.querySelector('.btn-spinner').classList.remove('hidden');
  btn.disabled = true;

  fetch(`${API_BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Invalid admin credentials.');
      }
      return data;
    })
    .then(adminUser => {
      localStorage.setItem('lc_admin', JSON.stringify(adminUser));
      window.location.href = 'admin-dashboard.html';
    })
    .catch(err => {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    })
    .finally(() => {
      btn.querySelector('.btn-text').textContent = 'Sign In as Admin';
      btn.querySelector('.btn-spinner').classList.add('hidden');
      btn.disabled = false;
    });
}

// Allow Enter key to submit admin login
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const form = document.getElementById('admin-login-form');
  if (form) handleAdminLogin();
});
