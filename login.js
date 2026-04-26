const API_BASE_URL = window.location.origin.startsWith('http')
  ? window.location.origin
  : 'http://localhost:3000';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// ===== PAGE LOADER =====
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('page-loader');
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(() => loader.remove(), 400);
    }
  }, 800);
});

// ===== FORM SWITCHING =====
function switchForm(name, e) {
  if (e) e.preventDefault();
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  const target = document.getElementById('form-' + name);
  if (target) target.classList.add('active');
}

function showForgotForm(e) {
  e.preventDefault();
  switchForm('forgot');
}

// ===== PASSWORD TOGGLE =====
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
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

// ===== PASSWORD STRENGTH =====
const regPw = document.getElementById('reg-password');
if (regPw) {
  regPw.addEventListener('input', () => {
    const val = regPw.value;
    const bars = document.querySelector('.pw-bars');
    const label = document.getElementById('pw-label');
    if (!bars || !label) return;

    bars.className = 'pw-bars';
    if (val.length === 0) { label.textContent = 'Enter a password'; return; }

    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const levels = ['', 'weak', 'fair', 'good', 'strong'];
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    bars.classList.add(levels[score] || 'weak');
    label.textContent = labels[score] || 'Weak';
  });
}

// ===== HANDLE LOGIN =====
function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  errorEl.classList.add('hidden');

  if (!email || !password) {
    errorEl.textContent = 'Please enter your email and password.';
    errorEl.classList.remove('hidden');
    return;
  }

  if (!EMAIL_REGEX.test(email)) {
    errorEl.textContent = 'Please enter a valid email address (e.g. user@example.com).';
    errorEl.classList.remove('hidden');
    return;
  }

  if (!PASSWORD_REGEX.test(password)) {
    errorEl.textContent = 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.';
    errorEl.classList.remove('hidden');
    return;
  }

  // Show spinner
  btn.querySelector('.btn-text').textContent = 'Signing in...';
  btn.querySelector('.btn-spinner').classList.remove('hidden');
  btn.disabled = true;

  fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Invalid email or password.');
      }
      return data;
    })
    .then(userData => {
      localStorage.setItem('lc_current_user', JSON.stringify(userData));
      if (document.getElementById('remember-me').checked) {
        localStorage.setItem('lc_remember', '1');
      } else {
        localStorage.removeItem('lc_remember');
      }
      window.location.href = 'dashboard.html';
    })
    .catch(err => {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    })
    .finally(() => {
      btn.querySelector('.btn-text').textContent = 'Sign In';
      btn.querySelector('.btn-spinner').classList.add('hidden');
      btn.disabled = false;
    });
}

// ===== HANDLE REGISTER =====
function handleRegister() {
  const firstName = document.getElementById('reg-firstname').value.trim();
  const lastName  = document.getElementById('reg-lastname').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const password  = document.getElementById('reg-password').value;
  const role      = document.getElementById('reg-role').value;
  const agreed    = document.getElementById('agree-terms').checked;
  const errorEl   = document.getElementById('register-error');
  const btn       = document.getElementById('register-btn');

  errorEl.classList.add('hidden');

  if (!firstName || !lastName) {
    errorEl.textContent = 'Please enter your full name.';
    errorEl.classList.remove('hidden'); return;
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    errorEl.textContent = 'Please enter a valid email address (e.g. user@example.com).';
    errorEl.classList.remove('hidden'); return;
  }
  if (!PASSWORD_REGEX.test(password)) {
    errorEl.textContent = 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.';
    errorEl.classList.remove('hidden'); return;
  }
  if (!role) {
    errorEl.textContent = 'Please select your role.';
    errorEl.classList.remove('hidden'); return;
  }
  if (!agreed) {
    errorEl.textContent = 'You must agree to the Terms of Service.';
    errorEl.classList.remove('hidden'); return;
  }

  btn.querySelector('.btn-text').textContent = 'Creating account...';
  btn.querySelector('.btn-spinner').classList.remove('hidden');
  btn.disabled = true;

  fetch(`${API_BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName, email, password, role })
  })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }
      return data;
    })
    .then(userData => {
      localStorage.setItem('lc_current_user', JSON.stringify(userData));
      window.location.href = 'dashboard.html';
    })
    .catch(err => {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    })
    .finally(() => {
      btn.querySelector('.btn-text').textContent = 'Create Account';
      btn.querySelector('.btn-spinner').classList.add('hidden');
      btn.disabled = false;
    });
}

// ===== HANDLE FORGOT =====
function handleForgot() {
  const email = document.getElementById('forgot-email').value.trim();
  const successEl = document.getElementById('forgot-success');

  if (!email || !EMAIL_REGEX.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }

  successEl.classList.remove('hidden');
  document.getElementById('forgot-email').value = '';
}

// ===== ENTER KEY SUPPORT =====
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const active = document.querySelector('.auth-form.active');
  if (!active) return;
  if (active.id === 'form-login') handleLogin();
  else if (active.id === 'form-register') handleRegister();
});

// ===== CHECK EXISTING SESSION =====
(function checkSession() {
  const user = localStorage.getItem('lc_current_user');
  if (user && localStorage.getItem('lc_remember')) {
    window.location.href = 'dashboard.html';
  }
})();
