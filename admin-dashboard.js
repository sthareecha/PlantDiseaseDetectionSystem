const API_BASE_URL = 'http://localhost:3000';

let adminUser = null;

const ALLOWED_ROLES = ['admin', 'farmer', 'researcher', 'student', 'agronomist', 'other'];

const adminState = {
  users: [],
  usersQuery: '',
  usersRole: 'all',
  usersPage: 1,
  usersPageSize: 20,

  scans: [],
  scansQuery: '',
  scansStatus: 'all',
  scansPage: 1,
  scansPageSize: 20,
};

window.addEventListener('load', () => {
  const data = localStorage.getItem('lc_admin');
  if (!data) {
    window.location.href = 'admin-login.html';
    return;
  }
  adminUser = JSON.parse(data);
  initAdminUI();
  loadAdminOverview();
  loadAdminUsers();
  loadAdminScans();
});

function initAdminUI() {
  const initials = getInitials(adminUser.firstName, adminUser.lastName);
  document.getElementById('admin-avatar').textContent = initials || 'A';
  document.getElementById('admin-name').textContent = `${adminUser.firstName} ${adminUser.lastName}`.trim() || 'Admin';

  const usersRoleEl = document.getElementById('admin-users-role');
  if (usersRoleEl) {
    usersRoleEl.innerHTML = [
      '<option value="all" selected>All roles</option>',
      ...ALLOWED_ROLES.map(r => `<option value="${r}">${r}</option>`)
    ].join('');
  }

  const bind = (id, event, handler) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(event, handler);
  };

  bind('admin-users-search', 'input', (e) => {
    adminState.usersQuery = e.target.value || '';
    adminState.usersPage = 1;
    renderAdminUsers();
  });
  bind('admin-users-role', 'change', (e) => {
    adminState.usersRole = e.target.value || 'all';
    adminState.usersPage = 1;
    renderAdminUsers();
  });
  bind('admin-users-page-size', 'change', (e) => {
    adminState.usersPageSize = Number(e.target.value) || 20;
    adminState.usersPage = 1;
    renderAdminUsers();
  });

  bind('admin-scans-search', 'input', (e) => {
    adminState.scansQuery = e.target.value || '';
    adminState.scansPage = 1;
    renderAdminScans();
  });
  bind('admin-scans-status', 'change', (e) => {
    adminState.scansStatus = e.target.value || 'all';
    adminState.scansPage = 1;
    renderAdminScans();
  });
  bind('admin-scans-page-size', 'change', (e) => {
    adminState.scansPageSize = Number(e.target.value) || 20;
    adminState.scansPage = 1;
    renderAdminScans();
  });
}

function showAdminPage(name, navEl) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById(`admin-page-${name}`);
  if (section) section.classList.add('active');
  if (navEl) navEl.classList.add('active');

  const titles = {
    overview: 'Admin Overview',
    users: 'Manage Users',
    scans: 'Scan Activity',
  };
  const topTitle = document.getElementById('admin-top-title');
  if (topTitle) topTitle.textContent = titles[name] || 'Admin';
}

function adminLogout() {
  localStorage.removeItem('lc_admin');
  window.location.href = 'admin-login.html';
}

function loadAdminOverview() {
  fetch(`${API_BASE_URL}/api/admin/summary`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('admin-total-users').textContent = data.totalUsers || 0;
      document.getElementById('admin-total-scans').textContent = data.totalScans || 0;
      document.getElementById('admin-diseased-scans').textContent = data.diseasedScans || 0;

      const latestEl = document.getElementById('admin-latest-scan');
      const latestMetaEl = document.getElementById('admin-latest-scan-meta');
      if (latestEl && latestMetaEl) {
        if (data.latestScan && data.latestScan.createdAt) {
          latestEl.textContent = new Date(data.latestScan.createdAt).toLocaleDateString();
          const who = data.latestScan.userName ? `by ${data.latestScan.userName}` : 'by unknown user';
          const dx = data.latestScan.diagnosis ? data.latestScan.diagnosis : 'Unknown';
          latestMetaEl.textContent = `${dx} • ${who}`;
        } else {
          latestEl.textContent = '—';
          latestMetaEl.textContent = 'No scans yet';
        }
      }
    })
    .catch(err => {
      console.error('Error loading admin overview:', err);
    });
}

function loadAdminUsers() {
  fetch(`${API_BASE_URL}/api/admin/users`)
    .then(res => res.json())
    .then(rows => {
      adminState.users = Array.isArray(rows) ? rows : [];
      adminState.usersPage = 1;
      renderAdminUsers();
    })
    .catch(err => {
      console.error('Error loading users:', err);
    });
}

function loadAdminScans() {
  fetch(`${API_BASE_URL}/api/admin/scans`)
    .then(res => res.json())
    .then(rows => {
      adminState.scans = Array.isArray(rows) ? rows : [];
      adminState.scansPage = 1;
      renderAdminScans();
    })
    .catch(err => {
      console.error('Error loading scans:', err);
    });
}

function getInitials(first, last) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || 'A';
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalize(str) {
  return String(str ?? '').toLowerCase().trim();
}

function renderPagination({ rootId, page, totalItems, pageSize, onPageChange }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const totalPages = Math.max(1, Math.ceil((totalItems || 0) / (pageSize || 1)));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const from = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalItems);

  root.innerHTML = `
    <div class="admin-pagination-inner">
      <div class="admin-pagination-meta">Showing ${from}-${to} of ${totalItems}</div>
      <div class="admin-pagination-actions">
        <button class="btn btn-outline btn-sm" ${safePage === 1 ? 'disabled' : ''} data-page="prev">Prev</button>
        <div class="admin-pagination-page">Page ${safePage} / ${totalPages}</div>
        <button class="btn btn-outline btn-sm" ${safePage === totalPages ? 'disabled' : ''} data-page="next">Next</button>
      </div>
    </div>
  `;

  root.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.getAttribute('data-page');
      if (dir === 'prev') onPageChange(safePage - 1);
      if (dir === 'next') onPageChange(safePage + 1);
    });
  });
}

function renderAdminUsers() {
  const wrap = document.getElementById('admin-users-table');
  const countEl = document.getElementById('admin-users-count');
  if (!wrap) return;

  const query = normalize(adminState.usersQuery);
  const roleFilter = adminState.usersRole;
  const filtered = adminState.users.filter(u => {
    if (roleFilter && roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!query) return true;
    const hay = normalize([
      u.id,
      `${u.first_name} ${u.last_name}`,
      u.email,
      u.role,
    ].join(' '));
    return hay.includes(query);
  });

  if (countEl) countEl.textContent = `${filtered.length} user${filtered.length === 1 ? '' : 's'}`;

  const pageSize = adminState.usersPageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  adminState.usersPage = Math.min(Math.max(1, adminState.usersPage), totalPages);
  const start = (adminState.usersPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  if (pageRows.length === 0) {
    wrap.textContent = 'No users found.';
    renderPagination({
      rootId: 'admin-users-pagination',
      page: 1,
      totalItems: 0,
      pageSize,
      onPageChange: () => {},
    });
    return;
  }

  wrap.innerHTML = `
    <table class="recent-scans-table admin-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map(u => {
          const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
          return `
            <tr>
              <td>${escapeHtml(u.id)}</td>
              <td>${escapeHtml(fullName || '—')}</td>
              <td>${escapeHtml(u.email)}</td>
              <td>
                <select class="filter-select admin-select" onchange="updateUserRole(${u.id}, this)">
                  ${ALLOWED_ROLES.map(r => `
                    <option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
              </td>
              <td>${u.joined_at ? new Date(u.joined_at).toLocaleDateString() : '—'}</td>
              <td>
                <button class="btn btn-danger btn-sm" onclick="deleteUserAdmin(${u.id})">Delete</button>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;

  renderPagination({
    rootId: 'admin-users-pagination',
    page: adminState.usersPage,
    totalItems: filtered.length,
    pageSize,
    onPageChange: (next) => {
      adminState.usersPage = next;
      renderAdminUsers();
    }
  });
}

function renderAdminScans() {
  const wrap = document.getElementById('admin-scans-table');
  const countEl = document.getElementById('admin-scans-count');
  if (!wrap) return;

  const query = normalize(adminState.scansQuery);
  const status = adminState.scansStatus;

  const filtered = adminState.scans.filter(s => {
    const diagnosis = s.diagnosis || '';
    if (status === 'healthy' && diagnosis !== 'Healthy') return false;
    if (status === 'diseased' && diagnosis === 'Healthy') return false;
    if (!query) return true;
    const hay = normalize([
      s.id,
      s.user_name,
      s.email,
      s.leaf_scanned,
      s.diagnosis,
    ].join(' '));
    return hay.includes(query);
  });

  if (countEl) countEl.textContent = `${filtered.length} scan${filtered.length === 1 ? '' : 's'}`;

  const pageSize = adminState.scansPageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  adminState.scansPage = Math.min(Math.max(1, adminState.scansPage), totalPages);
  const start = (adminState.scansPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  if (pageRows.length === 0) {
    wrap.textContent = 'No scans found.';
    renderPagination({
      rootId: 'admin-scans-pagination',
      page: 1,
      totalItems: 0,
      pageSize,
      onPageChange: () => {},
    });
    return;
  }

  wrap.innerHTML = `
    <table class="recent-scans-table admin-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>User</th>
          <th>Email</th>
          <th>Leaf</th>
          <th>Diagnosis</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map(s => {
          const diagnosis = s.diagnosis || 'Unknown';
          const badgeClass = diagnosis === 'Healthy' ? 'badge-good' : 'badge-warn';
          return `
            <tr>
              <td>${escapeHtml(s.id)}</td>
              <td>${escapeHtml(s.user_name || '—')}</td>
              <td>${escapeHtml(s.email || '—')}</td>
              <td>${escapeHtml(s.leaf_scanned || '—')}</td>
              <td><span class="badge ${badgeClass}">${escapeHtml(diagnosis)}</span></td>
              <td>${s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</td>
              <td><button class="btn btn-danger btn-sm" onclick="deleteScanAdmin(${s.id})">Delete</button></td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;

  renderPagination({
    rootId: 'admin-scans-pagination',
    page: adminState.scansPage,
    totalItems: filtered.length,
    pageSize,
    onPageChange: (next) => {
      adminState.scansPage = next;
      renderAdminScans();
    }
  });
}

// ===== Admin actions =====
function updateUserRole(id, selectEl) {
  const newRole = selectEl.value;
  fetch(`${API_BASE_URL}/api/admin/users/${id}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: newRole })
  })
    .then(res => res.json())
    .then(data => {
      console.log('Role update:', data);
      loadAdminOverview();
      loadAdminUsers();
    })
    .catch(err => {
      console.error('Error updating role:', err);
      alert('Failed to update role.');
    });
}

function deleteUserAdmin(id) {
  if (!confirm('Delete this user and all their scans?')) return;
  fetch(`${API_BASE_URL}/api/admin/users/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      console.log('User delete:', data);
      loadAdminOverview();
      loadAdminUsers();
      loadAdminScans();
    })
    .catch(err => {
      console.error('Error deleting user:', err);
      alert('Failed to delete user.');
    });
}

function deleteScanAdmin(id) {
  if (!confirm('Delete this scan?')) return;
  fetch(`${API_BASE_URL}/api/admin/scans/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      console.log('Scan delete:', data);
      loadAdminOverview();
      loadAdminScans();
    })
    .catch(err => {
      console.error('Error deleting scan:', err);
      alert('Failed to delete scan.');
    });
}
