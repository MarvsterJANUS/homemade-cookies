/* ============================================================
   COOKIE CORNER — Admin Dashboard Logic
   ============================================================ */

// ── State ──────────────────────────────────────────────────
let allOrders    = [];
let activeFilter = 'all';
let pendingDeleteId  = null;
let pendingDeleteType = null; // 'order' | 'cookie'

// ── Auth ───────────────────────────────────────────────────
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    showDashboard(session.user.email);
  } else {
    showLogin();
  }
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) showDashboard(session.user.email);
  else         showLogin();
});

function showLogin() {
  document.getElementById('login-screen').style.display  = 'flex';
  document.getElementById('admin-layout').classList.remove('active');
}

function showDashboard(email) {
  document.getElementById('login-screen').style.display  = 'none';
  document.getElementById('admin-layout').classList.add('active');
  document.getElementById('admin-user-email').textContent = email;
  initDashboard();
}

// Login form
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  errEl.style.display = 'none';
  btn.disabled        = true;
  btn.textContent     = 'Signing in…';

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  btn.disabled    = false;
  btn.textContent = 'Sign In';

  if (error) {
    errEl.textContent   = error.message || 'Login failed. Check your credentials.';
    errEl.style.display = 'block';
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// ── Dashboard Init ─────────────────────────────────────────
async function initDashboard() {
  await Promise.all([loadOrders(), loadCookiesAdmin()]);
  subscribeToOrders();
}

// ── Tabs ───────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  })
);

// ── Orders ─────────────────────────────────────────────────
async function loadOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { showToast('Could not load orders.', 'error'); return; }

  allOrders = data || [];
  renderOrders();
  updateStats();
}

function renderOrders() {
  const tbody = document.getElementById('orders-tbody');
  const visible = activeFilter === 'all'
    ? allOrders
    : allOrders.filter(o => o.status === activeFilter);

  if (visible.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">
      ${activeFilter === 'all' ? 'No orders yet — they\'ll appear here in real-time.' : `No ${activeFilter} orders.`}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = visible.map(o => `
    <tr data-order-id="${o.id}">
      <td>
        <div class="order-name">${esc(o.customer_name)}</div>
        ${o.note ? `<div class="order-note">"${esc(o.note)}"</div>` : ''}
      </td>
      <td>${esc(o.cookie_name)}</td>
      <td><span class="size-pill">${o.size === 'small' ? 'Mini 🫐' : 'Standard 🍪'}</span></td>
      <td><strong>${o.amount}</strong></td>
      <td><div class="order-time">${fmtDateTime(o.created_at)}</div></td>
      <td>
        <select class="status-select" data-order-id="${o.id}">
          <option value="pending"   ${o.status === 'pending'   ? 'selected' : ''}>⏳ Pending</option>
          <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>✅ Confirmed</option>
          <option value="ready"     ${o.status === 'ready'     ? 'selected' : ''}>🎉 Ready</option>
          <option value="done"      ${o.status === 'done'      ? 'selected' : ''}>✓ Done</option>
        </select>
      </td>
      <td>
        <button class="delete-order-btn" data-order-id="${o.id}" title="Delete order">🗑</button>
      </td>
    </tr>
  `).join('');

  // Status change
  tbody.querySelectorAll('.status-select').forEach(sel =>
    sel.addEventListener('change', () => updateOrderStatus(sel.dataset.orderId, sel.value))
  );

  // Delete buttons
  tbody.querySelectorAll('.delete-order-btn').forEach(btn =>
    btn.addEventListener('click', () => confirmDelete('order', btn.dataset.orderId, 'Delete this order?'))
  );
}

async function updateOrderStatus(orderId, status) {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) { showToast('Could not update status.', 'error'); return; }

  const order = allOrders.find(o => o.id === orderId);
  if (order) order.status = status;
  updateStats();
}

function updateStats() {
  const total    = allOrders.length;
  const pending  = allOrders.filter(o => o.status === 'pending').length;
  const ready    = allOrders.filter(o => o.status === 'ready').length;
  const done     = allOrders.filter(o => o.status === 'done').length;

  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-ready').textContent   = ready;
  document.getElementById('stat-done').textContent    = done;

  document.getElementById('pending-badge').textContent = pending;
  document.getElementById('pending-badge').className   = 'tab-badge' + (pending > 0 ? ' urgent' : '');
}

// Real-time subscription
function subscribeToOrders() {
  supabase.channel('orders-live')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
      allOrders.unshift(payload.new);
      renderOrders();
      updateStats();
      showToast(`New order from ${payload.new.customer_name}! 🍪`, 'success');
      highlightNewRow(payload.new.id);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
      const idx = allOrders.findIndex(o => o.id === payload.new.id);
      if (idx > -1) allOrders[idx] = payload.new;
      renderOrders();
      updateStats();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, payload => {
      allOrders = allOrders.filter(o => o.id !== payload.old.id);
      renderOrders();
      updateStats();
    })
    .subscribe();
}

function highlightNewRow(orderId) {
  const row = document.querySelector(`tr[data-order-id="${orderId}"]`);
  if (row) { row.classList.add('new-row'); setTimeout(() => row.classList.remove('new-row'), 2100); }
}

// Filters
document.querySelectorAll('.filter-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderOrders();
  })
);

// ── Cookies Admin ──────────────────────────────────────────
async function loadCookiesAdmin() {
  const grid = document.getElementById('cookies-manage-grid');

  const { data: cookies, error } = await supabase
    .from('cookies')
    .select('*')
    .order('name');

  if (error) { showToast('Could not load cookies.', 'error'); grid.innerHTML = ''; return; }

  document.getElementById('cookies-count-badge').textContent = (cookies || []).length;

  if (!cookies || cookies.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-300);font-size:.9rem">No cookies yet. Add one below!</p>';
    return;
  }

  grid.innerHTML = cookies.map(c => `
    <div class="manage-card ${c.available ? '' : 'unavailable'}" data-cookie-id="${c.id}">
      <div class="manage-emoji">${c.emoji || '🍪'}</div>
      <div class="manage-info">
        <h4>${esc(c.name)}</h4>
        <p>${c.description ? esc(c.description) : '(no description)'}</p>
      </div>
      <div class="manage-actions">
        <button class="toggle-btn ${c.available ? 'on' : ''}"
          data-cookie-id="${c.id}"
          data-available="${c.available}"
          title="${c.available ? 'Click to hide' : 'Click to show'}">
        </button>
        <button class="delete-order-btn" data-cookie-id="${c.id}" data-type="cookie" title="Delete cookie">🗑</button>
      </div>
    </div>
  `).join('');

  // Toggle availability
  grid.querySelectorAll('.toggle-btn').forEach(btn =>
    btn.addEventListener('click', () => toggleCookieAvailability(btn.dataset.cookieId, btn.dataset.available === 'true'))
  );

  // Delete cookie
  grid.querySelectorAll('[data-type="cookie"]').forEach(btn =>
    btn.addEventListener('click', () => confirmDelete('cookie', btn.dataset.cookieId, 'Delete this cookie? All reviews tied to it will also be removed.'))
  );
}

async function toggleCookieAvailability(cookieId, currentlyAvailable) {
  const { error } = await supabase
    .from('cookies')
    .update({ available: !currentlyAvailable })
    .eq('id', cookieId);

  if (error) { showToast('Could not update cookie.', 'error'); return; }
  showToast(currentlyAvailable ? 'Cookie hidden from customers.' : 'Cookie is now visible!', 'success');
  await loadCookiesAdmin();
}

// Add cookie form
document.getElementById('add-cookie-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name  = document.getElementById('new-cookie-name').value.trim();
  const desc  = document.getElementById('new-cookie-desc').value.trim();
  const emoji = document.getElementById('new-emoji').value.trim() || '🍪';
  const btn   = document.getElementById('add-cookie-btn');

  if (!name) { showToast('Please enter a cookie name.', 'error'); return; }

  btn.disabled    = true;
  btn.textContent = 'Adding…';

  const { error } = await supabase.from('cookies').insert({
    name,
    description: desc || null,
    emoji,
    available: true,
  });

  btn.disabled    = false;
  btn.textContent = 'Add Cookie';

  if (error) { showToast('Could not add cookie. Try again.', 'error'); return; }

  document.getElementById('add-cookie-form').reset();
  showToast(`"${name}" added!`, 'success');
  await loadCookiesAdmin();
});

// ── Delete confirmation modal ──────────────────────────────
function confirmDelete(type, id, message) {
  pendingDeleteType = type;
  pendingDeleteId   = id;
  document.getElementById('confirm-msg').textContent = message || 'This cannot be undone.';
  document.getElementById('confirm-modal').classList.remove('hidden');
}

document.getElementById('confirm-cancel').addEventListener('click', () => {
  document.getElementById('confirm-modal').classList.add('hidden');
  pendingDeleteId = null; pendingDeleteType = null;
});
document.getElementById('confirm-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('confirm-modal')) {
    document.getElementById('confirm-modal').classList.add('hidden');
    pendingDeleteId = null; pendingDeleteType = null;
  }
});

document.getElementById('confirm-ok').addEventListener('click', async () => {
  document.getElementById('confirm-modal').classList.add('hidden');
  if (!pendingDeleteId) return;

  if (pendingDeleteType === 'order') {
    const { error } = await supabase.from('orders').delete().eq('id', pendingDeleteId);
    if (error) { showToast('Could not delete order.', 'error'); return; }
    allOrders = allOrders.filter(o => o.id !== pendingDeleteId);
    renderOrders();
    updateStats();
    showToast('Order deleted.', 'info');
  }

  if (pendingDeleteType === 'cookie') {
    const { error } = await supabase.from('cookies').delete().eq('id', pendingDeleteId);
    if (error) { showToast('Could not delete cookie.', 'error'); return; }
    showToast('Cookie deleted.', 'info');
    await loadCookiesAdmin();
  }

  pendingDeleteId = null; pendingDeleteType = null;
});

// ── Helpers ────────────────────────────────────────────────
function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

function showToast(msg, type = 'info', duration = 3500) {
  const c     = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className   = `toast toast-${type}`;
  toast.textContent = msg;
  c.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('toast-visible')));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

// ── Boot ───────────────────────────────────────────────────
checkAuth();
