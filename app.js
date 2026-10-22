
// ===== DATA STORE (localStorage) =====
const DB = {
  get: (key) => JSON.parse(localStorage.getItem('ts_' + key) || '[]'),
  set: (key, data) => localStorage.setItem('ts_' + key, JSON.stringify(data)),
  push: (key, item) => { const d = DB.get(key); d.push(item); DB.set(key, d); },
  remove: (key, id) => DB.set(key, DB.get(key).filter(x => x.id !== id)),
  update: (key, id, item) => DB.set(key, DB.get(key).map(x => x.id === id ? item : x))
};

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const fmt = (n) => 'Rs.' + Number(n || 0).toLocaleString('en-IN', {minimumFractionDigits: 0});
const today = () => new Date().toISOString().split('T')[0];
const todayStr = () => new Date().toLocaleDateString('en-IN', {weekday:'long', year:'numeric', month:'long', day:'numeric'});

// ===== INIT =====
document.getElementById('pageDate').textContent = todayStr();

// ===== NAVIGATION =====
const pages = document.querySelectorAll('.page');
const navItems = document.querySelectorAll('.nav-item');
let currentPage = 'dashboard';

function navigate(page) {
  pages.forEach(p => p.classList.remove('active'));
  navItems.forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector('[data-page="' + page + '"]').classList.add('active');
  document.getElementById('pageTitle').textContent = {
    dashboard: 'Dashboard', sales: 'Sales', payments: 'Payment History',
    'online-payments': 'Online Payments', recharge: 'Mobile Recharge',
    staff: 'Staff', salary: 'Salary'
  }[page] || page;
  currentPage = page;
  renderPage(page);
}

navItems.forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); navigate(item.dataset.page); });
});

function renderPage(page) {
  if (page === 'dashboard') renderDashboard();
  else if (page === 'sales') renderSales();
  else if (page === 'payments') renderPayments();
  else if (page === 'online-payments') renderOnlinePayments();
  else if (page === 'recharge') renderRecharge();
  else if (page === 'staff') renderStaff();
  else if (page === 'salary') renderSalary();
}

// ===== TOAST =====
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 3000);
}

// ===== STATUS BADGE =====
function statusBadge(status) {
  return `<span class="status-badge ${status.toLowerCase()}">${status}</span>`;
}

// ===== CATEGORY BADGE =====
function catBadge(cat) {
  const cls = { Mobile: 'cat-mobile', Fridge: 'cat-fridge', TV: 'cat-tv', Accessories: 'cat-accessories' };
  return `<span class="cat-badge ${cls[cat] || 'cat-other'}">${cat}</span>`;
}

// ===== EMPTY STATE =====
function emptyRow(cols, msg = 'No records yet. Add your first entry!') {
  return `<tr><td colspan="${cols}"><div class="empty-state"><div class="empty-icon">📭</div><p>${msg}</p></div></td></tr>`;
}

// ===========================
// ===== DASHBOARD =====
// ===========================
let salesChartInst = null, catChartInst = null;

function renderDashboard() {
  const sales = DB.get('sales');
  const recharges = DB.get('recharges');
  const salaries = DB.get('salaries');
  const todayDate = today();

  const todaySales = sales.filter(s => s.date === todayDate).reduce((a,s) => a + s.total, 0);
  const totalRev = sales.reduce((a,s) => a + s.total, 0);
  const todayRecharges = recharges.filter(r => r.date === todayDate).length;
  const salaryDue = salaries.filter(s => s.status === 'Pending').reduce((a,s) => a + s.netPay, 0);

  document.getElementById('dashTodaySales').textContent = fmt(todaySales);
  document.getElementById('dashRevenue').textContent = fmt(totalRev);
  document.getElementById('dashRecharges').textContent = todayRecharges;
  document.getElementById('dashSalaryDue').textContent = fmt(salaryDue);

  // Sales chart
  const last7 = [];
  const last7Labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    last7.push(sales.filter(s => s.date === ds).reduce((a,s) => a + s.total, 0));
    last7Labels.push(d.toLocaleDateString('en-IN', {weekday:'short'}));
  }

  if (salesChartInst) salesChartInst.destroy();
  const sCtx = document.getElementById('salesChart').getContext('2d');
  salesChartInst = new Chart(sCtx, {
    type: 'line',
    data: {
      labels: last7Labels,
      datasets: [{
        label: 'Sales (Rs.)', data: last7, fill: true,
        backgroundColor: 'rgba(0,229,255,0.08)', borderColor: '#00e5ff',
        tension: 0.4, pointBackgroundColor: '#00e5ff', pointRadius: 4
      }]
    },
    options: {
      responsive: true, plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(30,45,69,0.5)' }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(30,45,69,0.5)' }, ticks: { color: '#64748b', callback: v => 'Rs.' + v } }
      }
    }
  });

  // Category chart
  const cats = ['Mobile', 'Fridge', 'TV', 'Accessories', 'Other'];
  const catData = cats.map(c => sales.filter(s => s.category === c).reduce((a,s) => a + s.total, 0));
  if (catChartInst) catChartInst.destroy();
  const cCtx = document.getElementById('categoryChart').getContext('2d');
  catChartInst = new Chart(cCtx, {
    type: 'doughnut',
    data: {
      labels: cats,
      datasets: [{ data: catData, backgroundColor: ['#00e5ff','#a855f7','#f97316','#22c55e','#64748b'], borderWidth: 0 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#94a3b8', font: { size: 12 } } } }
    }
  });

  // Recent sales
  const recentSales = [...sales].sort((a,b) => b.id.localeCompare(a.id)).slice(0, 5);
  const stbody = document.getElementById('dashRecentSalesTbody');
  stbody.innerHTML = recentSales.length ? recentSales.map(s => `
    <tr><td>${s.item}</td><td>${catBadge(s.category)}</td><td style="color:var(--cyan);font-weight:600">${fmt(s.total)}</td><td>${s.date}</td></tr>
  `).join('') : emptyRow(4, 'No sales yet');

  // Recent recharges
  const recentR = [...recharges].sort((a,b) => b.id.localeCompare(a.id)).slice(0, 5);
  const rtbody = document.getElementById('dashRecentRechargeTbody');
  rtbody.innerHTML = recentR.length ? recentR.map(r => `
    <tr><td>${r.mobile}</td><td>${r.operator}</td><td style="color:var(--cyan);font-weight:600">${fmt(r.amount)}</td><td>${r.date}</td></tr>
  `).join('') : emptyRow(4, 'No recharges yet');
}

// ===========================
// ===== SALES =====
// ===========================
function renderSales() {
  let sales = DB.get('sales');
  const catF = document.getElementById('salesCategoryFilter').value;
  const dateF = document.getElementById('salesDateFilter').value;
  if (catF) sales = sales.filter(s => s.category === catF);
  if (dateF) sales = sales.filter(s => s.date === dateF);
  sales = [...sales].sort((a,b) => b.id.localeCompare(a.id));

  document.getElementById('salesCount').textContent = sales.length + ' records';
  const tbody = document.getElementById('salesTbody');
  tbody.innerHTML = sales.length ? sales.map((s, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${s.item}</strong>${s.customer ? '<br><small style="color:var(--text-muted)">' + s.customer + '</small>' : ''}</td>
      <td>${catBadge(s.category)}</td>
      <td>${s.qty}</td>
      <td>${fmt(s.price)}</td>
      <td style="color:var(--cyan);font-weight:700">${fmt(s.total)}</td>
      <td><span class="status-badge received">${s.payment}</span></td>
      <td>${s.date}</td>
      <td><button class="btn-danger" onclick="deleteSale('${s.id}')">Delete</button></td>
    </tr>
  `).join('') : emptyRow(9);
}

document.getElementById('addSaleBtn').addEventListener('click', () => {
  document.getElementById('saleDate').value = today();
  document.getElementById('saleModal').classList.add('open');
});
document.getElementById('closeSaleModal').addEventListener('click', () => document.getElementById('saleModal').classList.remove('open'));
document.getElementById('cancelSale').addEventListener('click', () => document.getElementById('saleModal').classList.remove('open'));

function updateSaleTotal() {
  const qty = +document.getElementById('saleQty').value || 0;
  const price = +document.getElementById('salePrice').value || 0;
  document.getElementById('saleTotalPreview').textContent = fmt(qty * price);
}
document.getElementById('saleQty').addEventListener('input', updateSaleTotal);
document.getElementById('salePrice').addEventListener('input', updateSaleTotal);

document.getElementById('saleForm').addEventListener('submit', e => {
  e.preventDefault();
  const qty = +document.getElementById('saleQty').value;
  const price = +document.getElementById('salePrice').value;
  DB.push('sales', {
    id: genId(),
    item: document.getElementById('saleItem').value,
    category: document.getElementById('saleCategory').value,
    qty, price, total: qty * price,
    payment: document.getElementById('salePayment').value,
    date: document.getElementById('saleDate').value,
    customer: document.getElementById('saleCustomer').value
  });
  document.getElementById('saleForm').reset();
  document.getElementById('saleModal').classList.remove('open');
  renderSales();
  toast('Sale added successfully!');
});

function deleteSale(id) {
  if (confirm('Delete this sale record?')) { DB.remove('sales', id); renderSales(); toast('Sale deleted', 'error'); }
}

document.getElementById('salesCategoryFilter').addEventListener('change', renderSales);
document.getElementById('salesDateFilter').addEventListener('change', renderSales);
document.getElementById('clearSalesFilter').addEventListener('click', () => {
  document.getElementById('salesCategoryFilter').value = '';
  document.getElementById('salesDateFilter').value = '';
  renderSales();
});

// ===========================
// ===== PAYMENTS =====
// ===========================
function renderPayments() {
  let payments = DB.get('payments');
  const monthF = document.getElementById('paymentMonthFilter').value;
  if (monthF) payments = payments.filter(p => p.date.startsWith(monthF));
  payments = [...payments].sort((a,b) => b.id.localeCompare(a.id));

  const received = payments.filter(p => p.status === 'Received').reduce((a,p) => a + p.amount, 0);
  const cash = payments.filter(p => p.method === 'Cash').reduce((a,p) => a + p.amount, 0);
  const online = payments.filter(p => ['UPI','Online Transfer'].includes(p.method)).reduce((a,p) => a + p.amount, 0);
  const credit = payments.filter(p => p.method === 'Credit').reduce((a,p) => a + p.amount, 0);

  document.getElementById('totalReceived').textContent = fmt(received);
  document.getElementById('totalCash').textContent = fmt(cash);
  document.getElementById('totalOnline').textContent = fmt(online);
  document.getElementById('totalCredit').textContent = fmt(credit);
  document.getElementById('paymentCount').textContent = payments.length + ' records';

  const tbody = document.getElementById('paymentsTbody');
  tbody.innerHTML = payments.length ? payments.map((p, i) => `
    <tr>
      <td>${i+1}</td><td>${p.desc}</td>
      <td><span class="status-badge received">${p.method}</span></td>
      <td style="color:var(--cyan);font-weight:700">${fmt(p.amount)}</td>
      <td>${statusBadge(p.status)}</td><td>${p.date}</td>
      <td><button class="btn-danger" onclick="deletePayment('${p.id}')">Delete</button></td>
    </tr>
  `).join('') : emptyRow(7);
}

document.getElementById('addPaymentBtn').addEventListener('click', () => {
  document.getElementById('payDate').value = today();
  document.getElementById('paymentModal').classList.add('open');
});
document.getElementById('closePaymentModal').addEventListener('click', () => document.getElementById('paymentModal').classList.remove('open'));
document.getElementById('cancelPayment').addEventListener('click', () => document.getElementById('paymentModal').classList.remove('open'));

document.getElementById('paymentForm').addEventListener('submit', e => {
  e.preventDefault();
  DB.push('payments', {
    id: genId(), desc: document.getElementById('payDesc').value,
    amount: +document.getElementById('payAmount').value,
    method: document.getElementById('payMethod').value,
    status: document.getElementById('payStatus').value,
    date: document.getElementById('payDate').value
  });
  document.getElementById('paymentForm').reset();
  document.getElementById('paymentModal').classList.remove('open');
  renderPayments();
  toast('Payment recorded!');
});

function deletePayment(id) {
  if (confirm('Delete this payment?')) { DB.remove('payments', id); renderPayments(); toast('Deleted', 'error'); }
}

document.getElementById('paymentMonthFilter').addEventListener('change', renderPayments);
document.getElementById('clearPaymentFilter').addEventListener('click', () => {
  document.getElementById('paymentMonthFilter').value = '';
  renderPayments();
});

// ===========================
// ===== ONLINE PAYMENTS =====
// ===========================
function renderOnlinePayments() {
  let payments = DB.get('online_payments');
  const platF = document.getElementById('onlinePayPlatformFilter').value;
  const monthF = document.getElementById('onlinePayMonthFilter').value;
  if (platF) payments = payments.filter(p => p.platform === platF);
  if (monthF) payments = payments.filter(p => p.date.startsWith(monthF));
  payments = [...payments].sort((a,b) => b.id.localeCompare(a.id));

  const all = DB.get('online_payments');
  document.getElementById('totalOnlinePay').textContent = fmt(all.reduce((a,p) => a + p.amount, 0));
  document.getElementById('totalPhonePe').textContent = fmt(all.filter(p => p.platform === 'PhonePe').reduce((a,p) => a + p.amount, 0));
  document.getElementById('totalGPay').textContent = fmt(all.filter(p => p.platform === 'GPay').reduce((a,p) => a + p.amount, 0));
  document.getElementById('totalPaytm').textContent = fmt(all.filter(p => p.platform === 'Paytm').reduce((a,p) => a + p.amount, 0));
  document.getElementById('onlinePayCount').textContent = payments.length + ' records';

  const tbody = document.getElementById('onlinePayTbody');
  tbody.innerHTML = payments.length ? payments.map((p, i) => `
    <tr>
      <td>${i+1}</td><td>${p.desc}</td>
      <td><span class="status-badge received">${p.platform}</span></td>
      <td style="color:var(--text-muted);font-size:12px">${p.txnId || '-'}</td>
      <td style="color:var(--cyan);font-weight:700">${fmt(p.amount)}</td>
      <td>${statusBadge(p.status)}</td><td>${p.date}</td>
      <td><button class="btn-danger" onclick="deleteOnlinePay('${p.id}')">Delete</button></td>
    </tr>
  `).join('') : emptyRow(8);
}

document.getElementById('addOnlinePayBtn').addEventListener('click', () => {
  document.getElementById('opDate').value = today();
  document.getElementById('onlinePayModal').classList.add('open');
});
document.getElementById('closeOnlinePayModal').addEventListener('click', () => document.getElementById('onlinePayModal').classList.remove('open'));
document.getElementById('cancelOnlinePay').addEventListener('click', () => document.getElementById('onlinePayModal').classList.remove('open'));

document.getElementById('onlinePayForm').addEventListener('submit', e => {
  e.preventDefault();
  DB.push('online_payments', {
    id: genId(), desc: document.getElementById('opDesc').value,
    platform: document.getElementById('opPlatform').value,
    txnId: document.getElementById('opTxnId').value,
    amount: +document.getElementById('opAmount').value,
    status: document.getElementById('opStatus').value,
    date: document.getElementById('opDate').value
  });
  document.getElementById('onlinePayForm').reset();
  document.getElementById('onlinePayModal').classList.remove('open');
  renderOnlinePayments();
  toast('Online payment recorded!');
});

function deleteOnlinePay(id) {
  if (confirm('Delete?')) { DB.remove('online_payments', id); renderOnlinePayments(); toast('Deleted', 'error'); }
}

document.getElementById('onlinePayPlatformFilter').addEventListener('change', renderOnlinePayments);
document.getElementById('onlinePayMonthFilter').addEventListener('change', renderOnlinePayments);
document.getElementById('clearOnlinePayFilter').addEventListener('click', () => {
  document.getElementById('onlinePayPlatformFilter').value = '';
  document.getElementById('onlinePayMonthFilter').value = '';
  renderOnlinePayments();
});

// ===========================
// ===== RECHARGE =====
// ===========================
function renderRecharge() {
  let recharges = DB.get('recharges');
  const opF = document.getElementById('rechargeOperatorFilter').value;
  const dateF = document.getElementById('rechargeDateFilter').value;
  if (opF) recharges = recharges.filter(r => r.operator === opF);
  if (dateF) recharges = recharges.filter(r => r.date === dateF);
  recharges = [...recharges].sort((a,b) => b.id.localeCompare(a.id));

  const all = DB.get('recharges');
  document.getElementById('totalRechargeAmt').textContent = fmt(all.reduce((a,r) => a + r.amount, 0));
  document.getElementById('totalJio').textContent = fmt(all.filter(r => r.operator === 'Jio').reduce((a,r) => a + r.amount, 0));
  document.getElementById('totalAirtel').textContent = fmt(all.filter(r => r.operator === 'Airtel').reduce((a,r) => a + r.amount, 0));
  document.getElementById('totalVi').textContent = fmt(all.filter(r => r.operator === 'Vi').reduce((a,r) => a + r.amount, 0));
  document.getElementById('rechargeCount').textContent = recharges.length + ' records';

  const tbody = document.getElementById('rechargeTbody');
  tbody.innerHTML = recharges.length ? recharges.map((r, i) => `
    <tr>
      <td>${i+1}</td><td><strong>${r.mobile}</strong>${r.customer ? '<br><small style="color:var(--text-muted)">' + r.customer + '</small>' : ''}</td>
      <td><span class="status-badge received">${r.operator}</span></td>
      <td style="color:var(--text-dim)">${r.plan || '-'}</td>
      <td style="color:var(--cyan);font-weight:700">${fmt(r.amount)}</td>
      <td style="color:var(--green)">${r.commission ? fmt(r.commission) : '-'}</td>
      <td>${r.date}</td>
      <td><button class="btn-danger" onclick="deleteRecharge('${r.id}')">Delete</button></td>
    </tr>
  `).join('') : emptyRow(8);
}

document.getElementById('addRechargeBtn').addEventListener('click', () => {
  document.getElementById('rechDate').value = today();
  document.getElementById('rechargeModal').classList.add('open');
});
document.getElementById('closeRechargeModal').addEventListener('click', () => document.getElementById('rechargeModal').classList.remove('open'));
document.getElementById('cancelRecharge').addEventListener('click', () => document.getElementById('rechargeModal').classList.remove('open'));

document.getElementById('rechargeForm').addEventListener('submit', e => {
  e.preventDefault();
  DB.push('recharges', {
    id: genId(),
    mobile: document.getElementById('rechMobile').value,
    operator: document.getElementById('rechOperator').value,
    plan: document.getElementById('rechPlan').value,
    amount: +document.getElementById('rechAmount').value,
    commission: +document.getElementById('rechCommission').value || 0,
    date: document.getElementById('rechDate').value,
    customer: document.getElementById('rechCustomer').value
  });
  document.getElementById('rechargeForm').reset();
  document.getElementById('rechargeModal').classList.remove('open');
  renderRecharge();
  toast('Recharge logged!');
});

function deleteRecharge(id) {
  if (confirm('Delete?')) { DB.remove('recharges', id); renderRecharge(); toast('Deleted', 'error'); }
}

document.getElementById('rechargeOperatorFilter').addEventListener('change', renderRecharge);
document.getElementById('rechargeDateFilter').addEventListener('change', renderRecharge);
document.getElementById('clearRechargeFilter').addEventListener('click', () => {
  document.getElementById('rechargeOperatorFilter').value = '';
  document.getElementById('rechargeDateFilter').value = '';
  renderRecharge();
});

// ===========================
// ===== STAFF =====
// ===========================
function renderStaff() {
  const staff = DB.get('staff');
  const grid = document.getElementById('staffGrid');
  if (!staff.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">👤</div><p>No staff added yet. Add your first staff member!</p></div>';
    return;
  }
  grid.innerHTML = staff.map(s => `
    <div class="staff-card">
      <div class="staff-card-header">
        <div class="staff-avatar">${s.name.charAt(0).toUpperCase()}</div>
        <div><div class="staff-name">${s.name}</div><div class="staff-role">${s.role}</div></div>
      </div>
      <div class="staff-info">
        <div class="staff-info-row"><span>Mobile</span><span>${s.mobile || '-'}</span></div>
        <div class="staff-info-row"><span>Joined</span><span>${s.joining}</span></div>
        <div class="staff-info-row"><span>Salary</span><span style="color:var(--cyan)">${fmt(s.salary)}/mo</span></div>
        <div class="staff-info-row"><span>Status</span><span>${'<span class="status-badge ' + s.status.toLowerCase() + '">' + s.status + '</span>'}</span></div>
      </div>
      <div class="staff-actions">
        <button class="btn-edit" onclick="editStaff('${s.id}')">Edit</button>
        <button class="btn-danger" onclick="deleteStaff('${s.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('addStaffBtn').addEventListener('click', () => {
  document.getElementById('staffEditId').value = '';
  document.getElementById('staffModalTitle').textContent = 'Add Staff Member';
  document.getElementById('staffSubmitBtn').textContent = 'Add Staff';
  document.getElementById('staffForm').reset();
  document.getElementById('staffJoining').value = today();
  document.getElementById('staffModal').classList.add('open');
});
document.getElementById('closeStaffModal').addEventListener('click', () => document.getElementById('staffModal').classList.remove('open'));
document.getElementById('cancelStaff').addEventListener('click', () => document.getElementById('staffModal').classList.remove('open'));

document.getElementById('staffForm').addEventListener('submit', e => {
  e.preventDefault();
  const editId = document.getElementById('staffEditId').value;
  const data = {
    id: editId || genId(),
    name: document.getElementById('staffName').value,
    role: document.getElementById('staffRole').value,
    mobile: document.getElementById('staffMobile').value,
    joining: document.getElementById('staffJoining').value,
    salary: +document.getElementById('staffSalary').value,
    status: document.getElementById('staffStatus').value
  };
  if (editId) DB.update('staff', editId, data);
  else DB.push('staff', data);
  document.getElementById('staffModal').classList.remove('open');
  renderStaff();
  toast(editId ? 'Staff updated!' : 'Staff added!');
});

function editStaff(id) {
  const s = DB.get('staff').find(x => x.id === id);
  if (!s) return;
  document.getElementById('staffEditId').value = s.id;
  document.getElementById('staffName').value = s.name;
  document.getElementById('staffRole').value = s.role;
  document.getElementById('staffMobile').value = s.mobile;
  document.getElementById('staffJoining').value = s.joining;
  document.getElementById('staffSalary').value = s.salary;
  document.getElementById('staffStatus').value = s.status;
  document.getElementById('staffModalTitle').textContent = 'Edit Staff Member';
  document.getElementById('staffSubmitBtn').textContent = 'Update Staff';
  document.getElementById('staffModal').classList.add('open');
}

function deleteStaff(id) {
  if (confirm('Delete this staff member?')) { DB.remove('staff', id); renderStaff(); toast('Staff removed', 'error'); }
}

// ===========================
// ===== SALARY =====
// ===========================
function populateSalaryStaffDropdown() {
  const staff = DB.get('staff').filter(s => s.status === 'Active');
  const sel = document.getElementById('salaryStaffId');
  sel.innerHTML = '<option value="">Select Staff</option>' + staff.map(s => `<option value="${s.id}">${s.name} — ${s.role}</option>`).join('');
}

document.getElementById('salaryStaffId').addEventListener('change', function() {
  const staff = DB.get('staff').find(s => s.id === this.value);
  if (staff) document.getElementById('salaryBase').value = staff.salary;
  calcNetPay();
});

function calcNetPay() {
  const base = +document.getElementById('salaryBase').value || 0;
  const bonus = +document.getElementById('salaryBonus').value || 0;
  const ded = +document.getElementById('salaryDeduction').value || 0;
  document.getElementById('salaryNetPay').value = base + bonus - ded;
}

['salaryBase', 'salaryBonus', 'salaryDeduction'].forEach(id => document.getElementById(id).addEventListener('input', calcNetPay));

function renderSalary() {
  populateSalaryStaffDropdown();
  let salaries = DB.get('salaries');
  const monthF = document.getElementById('salaryMonthFilter').value;
  if (monthF) salaries = salaries.filter(s => s.month === monthF);
  salaries = [...salaries].sort((a,b) => b.id.localeCompare(a.id));

  const allSal = DB.get('salaries');
  const curMonth = new Date().toISOString().slice(0,7);
  const paidThisMonth = allSal.filter(s => s.month === curMonth && s.status === 'Paid').reduce((a,s) => a + s.netPay, 0);
  const due = allSal.filter(s => s.status === 'Pending').reduce((a,s) => a + s.netPay, 0);
  const activeStaff = DB.get('staff').filter(s => s.status === 'Active').length;

  document.getElementById('totalSalaryPaid').textContent = fmt(paidThisMonth);
  document.getElementById('totalSalaryDue').textContent = fmt(due);
  document.getElementById('activeStaffCount').textContent = activeStaff;
  document.getElementById('salaryCount').textContent = salaries.length + ' records';

  const tbody = document.getElementById('salaryTbody');
  tbody.innerHTML = salaries.length ? salaries.map((s, i) => `
    <tr>
      <td>${i+1}</td><td><strong>${s.staffName}</strong></td><td>${s.staffRole}</td>
      <td>${s.month}</td>
      <td>${fmt(s.base)}</td>
      <td style="color:var(--green)">${s.bonus > 0 ? '+' + fmt(s.bonus) : '-'}</td>
      <td style="color:var(--red)">${s.deduction > 0 ? '-' + fmt(s.deduction) : '-'}</td>
      <td style="color:var(--cyan);font-weight:700">${fmt(s.netPay)}</td>
      <td>${statusBadge(s.status)}</td>
      <td><button class="btn-danger" onclick="deleteSalary('${s.id}')">Delete</button></td>
    </tr>
  `).join('') : emptyRow(10);
}

document.getElementById('addSalaryBtn').addEventListener('click', () => {
  document.getElementById('salaryForm').reset();
  document.getElementById('salaryBonus').value = '0';
  document.getElementById('salaryDeduction').value = '0';
  const curMonth = new Date().toISOString().slice(0,7);
  document.getElementById('salaryMonth').value = curMonth;
  populateSalaryStaffDropdown();
  document.getElementById('salaryModal').classList.add('open');
});
document.getElementById('closeSalaryModal').addEventListener('click', () => document.getElementById('salaryModal').classList.remove('open'));
document.getElementById('cancelSalary').addEventListener('click', () => document.getElementById('salaryModal').classList.remove('open'));

document.getElementById('salaryForm').addEventListener('submit', e => {
  e.preventDefault();
  const staffId = document.getElementById('salaryStaffId').value;
  const staffMember = DB.get('staff').find(s => s.id === staffId);
  if (!staffMember) { toast('Please select a staff member', 'error'); return; }
  DB.push('salaries', {
    id: genId(), staffId, staffName: staffMember.name, staffRole: staffMember.role,
    month: document.getElementById('salaryMonth').value,
    base: +document.getElementById('salaryBase').value,
    bonus: +document.getElementById('salaryBonus').value || 0,
    deduction: +document.getElementById('salaryDeduction').value || 0,
    netPay: +document.getElementById('salaryNetPay').value,
    payMethod: document.getElementById('salaryPayMethod').value,
    status: document.getElementById('salaryStatus').value,
    notes: document.getElementById('salaryNotes').value
  });
  document.getElementById('salaryModal').classList.remove('open');
  renderSalary();
  toast('Salary saved!');
});

function deleteSalary(id) {
  if (confirm('Delete salary record?')) { DB.remove('salaries', id); renderSalary(); toast('Deleted', 'error'); }
}

document.getElementById('salaryMonthFilter').addEventListener('change', renderSalary);
document.getElementById('clearSalaryFilter').addEventListener('click', () => {
  document.getElementById('salaryMonthFilter').value = '';
  renderSalary();
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// ===== INITIAL RENDER =====
renderDashboard();
