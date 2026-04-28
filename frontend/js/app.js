/* ═══════════════════════════════════════════
   InternLog — Frontend JS
   ═══════════════════════════════════════════ */

const API = 'https://internship-tracker-v2-backend.onrender.com/api';
let currentRole = 'student';
let currentRating = 0;
let allReports = [];
let allStudents = [];
let currentDetailReport = null; // stores the report open in detail modal

// ── Helpers ──────────────────────────────────
const $ = id => document.getElementById(id);
const token = () => localStorage.getItem('il_token');
const user = () => JSON.parse(localStorage.getItem('il_user') || 'null');

async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {})
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function setLoading(btnId, loading) {
  const btn = $(btnId);
  if (!btn) return;
  btn.disabled = loading;
  const loader = btn.querySelector('.btn-loader');
  const txt = btn.querySelector('span');
  if (loader) loader.classList.toggle('hidden', !loading);
  if (txt) txt.style.opacity = loading ? '0.5' : '1';
}

function showError(id, msg) {
  const el = $(id);
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}
function showSuccess(id, msg) {
  const el = $(id);
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}
function hideMsg(id) { $(id).classList.remove('show'); }

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
function isoDate(d) {
  return new Date(d).toISOString().split('T')[0];
}

// ── Auth Tab / Role ────────────────────────────
function setRole(role, btn) {
  currentRole = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  $('student-fields').classList.toggle('hidden', role !== 'student');
  $('mentor-fields').classList.toggle('hidden', role !== 'mentor');
}

function switchTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  $('login-form').classList.toggle('hidden', tab !== 'login');
  $('register-form').classList.toggle('hidden', tab !== 'register');
}

// ── Login / Register ──────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  hideMsg('login-error');
  setLoading('login-btn', true);
  try {
    const data = await api('/auth/login', 'POST', {
      email: $('login-email').value,
      password: $('login-password').value
    });
    localStorage.setItem('il_token', data.token);
    localStorage.setItem('il_user', JSON.stringify(data.user));
    initApp(data.user);
  } catch (err) {
    showError('login-error', err.message);
  } finally {
    setLoading('login-btn', false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  hideMsg('register-error');
  setLoading('register-btn', true);
  try {
    const payload = {
      name: $('reg-name').value,
      email: $('reg-email').value,
      password: $('reg-password').value,
      role: currentRole,
      rollNumber: $('reg-roll').value,
      college: $('reg-college').value,
      internshipTitle: $('reg-internship').value,
      organization: $('reg-org').value,
      designation: $('reg-designation').value
    };
    const data = await api('/auth/register', 'POST', payload);
    localStorage.setItem('il_token', data.token);
    localStorage.setItem('il_user', JSON.stringify(data.user));
    initApp(data.user);
  } catch (err) {
    showError('register-error', err.message);
  } finally {
    setLoading('register-btn', false);
  }
}

function logout() {
  localStorage.removeItem('il_token');
  localStorage.removeItem('il_user');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('auth-screen').classList.add('active');
}

// ── App Init ──────────────────────────────────
function initApp(u) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  if (u.role === 'student') {
    $('student-screen').classList.add('active');
    $('student-name-nav').textContent = u.name;
    initStudentDash();
  } else {
    $('mentor-screen').classList.add('active');
    $('mentor-name-nav').textContent = u.name;
    initMentorDash();
  }
}

// ── Student Nav Tabs ───────────────────────────
function showStudentTab(tab, btn) {
  document.querySelectorAll('#student-screen .nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('#student-screen .tab-content').forEach(t => t.classList.remove('active'));
  $('tab-' + tab).classList.add('active');
  if (tab === 'history') loadStudentHistory();
}

// ── Student Dashboard ──────────────────────────
async function initStudentDash() {
  const now = new Date();
  const hour = now.getHours();
  $('time-greeting').textContent = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  $('student-greeting').textContent = user().name.split(' ')[0];
  $('today-date-display').textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  $('report-date').value = isoDate(now);

  try {
    const stats = await api('/reports/stats/my');
    $('stat-total').textContent = stats.total;
    $('stat-reviewed').textContent = stats.reviewed;
    $('stat-month').textContent = stats.thisMonth;
    $('stat-pending').textContent = stats.pending;
  } catch (e) {}

  loadRecentReports();
}

async function loadRecentReports() {
  try {
    const reports = await api('/reports/my');
    const container = $('recent-reports-list');
    if (!reports.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>No reports yet. Submit your first daily report!</p></div>`;
      return;
    }
    container.innerHTML = reports.slice(0, 6).map(r => buildStudentCard(r)).join('');
  } catch (e) {}
}

async function loadStudentHistory() {
  try {
    const reports = await api('/reports/my');
    const container = $('history-list');
    if (!reports.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>You haven't submitted any reports yet.</p></div>`;
      return;
    }
    container.innerHTML = reports.map(r => buildStudentCard(r, true)).join('');
  } catch (e) {}
}

function buildStudentCard(r, full = false) {
  const reviewed = r.isReviewed;
  const tasks = r.tasks || [];
  // Encode report data safely for onclick
  const encoded = encodeURIComponent(JSON.stringify(r));
  return `
    <div class="report-card ${reviewed ? 'reviewed' : ''}" onclick="showReportDetailEncoded('${encoded}')">
      <span class="card-download-hint">📥 Click to view & download</span>
      <div class="rc-header">
        <span class="rc-date">${formatDate(r.date)}</span>
        <span class="rc-badge ${reviewed ? 'reviewed-badge' : 'pending-badge'}">${reviewed ? '✅ Reviewed' : '⏳ Pending'}</span>
      </div>
      <div class="rc-tasks">${tasks.length} task${tasks.length !== 1 ? 's' : ''}: ${tasks.slice(0, 2).map(t => t.title).join(', ')}${tasks.length > 2 ? '...' : ''}</div>
      <div class="rc-meta">
        <span>⏱ ${r.hoursWorked || 0}h</span>
        ${reviewed && r.mentorRating ? `<span class="rc-rating">${'★'.repeat(r.mentorRating)}</span>` : ''}
      </div>
      ${reviewed && r.mentorFeedback ? `<div class="rc-feedback">"${r.mentorFeedback.substring(0, 80)}${r.mentorFeedback.length > 80 ? '...' : ''}"</div>` : ''}
    </div>`;
}

// ── Submit Report ─────────────────────────────
function addTask() {
  const container = $('tasks-container');
  const items = container.querySelectorAll('.task-item');
  const idx = items.length;
  const div = document.createElement('div');
  div.className = 'task-item';
  div.dataset.index = idx;
  div.innerHTML = `
    <div class="task-num">${idx + 1}</div>
    <div class="task-fields">
      <input type="text" placeholder="Task title" class="task-title" required/>
      <input type="text" placeholder="Description (optional)" class="task-desc"/>
      <input type="text" placeholder="Duration (e.g. 2 hrs)" class="task-duration"/>
      <select class="task-status">
        <option value="completed">✅ Completed</option>
        <option value="in-progress">🔄 In Progress</option>
        <option value="pending">⏳ Pending</option>
      </select>
    </div>
    <button type="button" class="btn-remove-task" onclick="removeTask(this)">✕</button>`;
  container.appendChild(div);
}

function removeTask(btn) {
  const container = $('tasks-container');
  if (container.querySelectorAll('.task-item').length <= 1) return;
  btn.closest('.task-item').remove();
  container.querySelectorAll('.task-item').forEach((item, i) => {
    item.querySelector('.task-num').textContent = i + 1;
  });
}

async function submitReport(e) {
  e.preventDefault();
  hideMsg('submit-error');
  hideMsg('submit-success');

  const taskItems = $('tasks-container').querySelectorAll('.task-item');
  const tasks = Array.from(taskItems).map(item => ({
    title: item.querySelector('.task-title').value,
    description: item.querySelector('.task-desc').value,
    duration: item.querySelector('.task-duration').value,
    status: item.querySelector('.task-status').value
  })).filter(t => t.title.trim());

  if (!tasks.length) return showError('submit-error', 'Add at least one task.');

  const payload = {
    date: $('report-date').value,
    hoursWorked: parseFloat($('report-hours').value) || 0,
    tasks,
    learnings: '',
    challenges: '',
    nextDayPlan: $('report-plan').value
  };

  setLoading('submit-report-btn', true);
  try {
    await api('/reports', 'POST', payload);
    showSuccess('submit-success', '✅ Report submitted successfully!');
    e.target.reset();
    $('report-date').value = isoDate(new Date());
    $('tasks-container').innerHTML = `
      <div class="task-item" data-index="0">
        <div class="task-num">1</div>
        <div class="task-fields">
          <input type="text" placeholder="Task title" class="task-title" required/>
          <input type="text" placeholder="Description (optional)" class="task-desc"/>
          <input type="text" placeholder="Duration (e.g. 2 hrs)" class="task-duration"/>
          <select class="task-status">
            <option value="completed">✅ Completed</option>
            <option value="in-progress">🔄 In Progress</option>
            <option value="pending">⏳ Pending</option>
          </select>
        </div>
        <button type="button" class="btn-remove-task" onclick="removeTask(this)">✕</button>
      </div>`;
    initStudentDash();
  } catch (err) {
    showError('submit-error', err.message);
  } finally {
    setLoading('submit-report-btn', false);
  }
}

// ── Shared authenticated download helper ───────
async function downloadExcel(url, filename) {
  const token = localStorage.getItem('il_token');
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) { alert('Export failed: ' + (await res.json()).message); return; }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || 'report.xlsx';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Excel Export (All Reports) ─────────────────
function exportExcel() {
  downloadExcel(API + '/export/excel', 'internship_reports.xlsx');
}

// ── Excel Export (Single Report) ──────────────
function downloadSingleReport() {
  if (!currentDetailReport) return;
  downloadExcel(`${API}/export/excel/single/${currentDetailReport._id}`, 'report.xlsx');
}

// ── Mentor Dashboard ───────────────────────────
function showMentorTab(tab, btn) {
  document.querySelectorAll('#mentor-screen .nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('#mentor-screen .tab-content').forEach(t => t.classList.remove('active'));
  $('tab-' + tab).classList.add('active');
  if (tab === 'reports') loadAllReports();
}

async function initMentorDash() {
  try {
    const [reports, students] = await Promise.all([
      api('/reports/all'),
      api('/auth/students')
    ]);
    allReports = reports;
    allStudents = students;

    $('m-stat-students').textContent = students.length;
    $('m-stat-reports').textContent = reports.length;
    $('m-stat-pending').textContent = reports.filter(r => !r.isReviewed).length;

    renderStudentsGrid(students, reports);
    populateStudentFilter(students);
  } catch (e) { console.error(e); }
}

function renderStudentsGrid(students, reports) {
  const container = $('students-grid');
  if (!students.length) {
    container.innerHTML = `<div class="empty-state"><p>No students registered yet.</p></div>`;
    return;
  }
  container.innerHTML = students.map(s => {
    const sReports = reports.filter(r => (r.student?._id === s._id) || (r.student === s._id));
    const reviewed = sReports.filter(r => r.isReviewed).length;
    return `
      <div class="student-card">
        <div class="sc-avatar">${s.name.charAt(0).toUpperCase()}</div>
        <div class="sc-name">${s.name}</div>
        <div class="sc-info">${s.rollNumber || ''} ${s.college ? '· ' + s.college : ''}</div>
        <div class="sc-info" style="margin-top:2px">${s.internshipTitle || ''}</div>
        <div class="sc-stats">
          <div class="sc-stat"><strong>${sReports.length}</strong>Reports</div>
          <div class="sc-stat"><strong>${reviewed}</strong>Reviewed</div>
          <div class="sc-stat"><strong>${sReports.length - reviewed}</strong>Pending</div>
        </div>
        <button class="sc-btn" onclick="filterByStudent('${s._id}')">View Reports →</button>
      </div>`;
  }).join('');
}

function populateStudentFilter(students) {
  const select = $('filter-student');
  // clear existing options except first
  while (select.options.length > 1) select.remove(1);
  students.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s._id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
}

function filterByStudent(id) {
  showMentorTab('reports', document.querySelector('#mentor-screen .nav-btn:nth-child(2)'));
  $('filter-student').value = id;
  filterReports();
}

async function loadAllReports() {
  try {
    allReports = await api('/reports/all');
    renderAllReports(allReports);
  } catch (e) {}
}

function filterReports() {
  const studentId = $('filter-student').value;
  const status = $('filter-status').value;
  let filtered = allReports;
  if (studentId) filtered = filtered.filter(r => (r.student?._id || r.student) === studentId);
  if (status === 'pending') filtered = filtered.filter(r => !r.isReviewed);
  if (status === 'reviewed') filtered = filtered.filter(r => r.isReviewed);
  renderAllReports(filtered);
}

function renderAllReports(reports) {
  const container = $('all-reports-list');
  if (!reports.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No reports found.</p></div>`;
    return;
  }
  container.innerHTML = reports.map(r => {
    const s = r.student || {};
    const tasks = r.tasks || [];
    const encoded = encodeURIComponent(JSON.stringify(r));
    return `
      <div class="mentor-report-card ${r.isReviewed ? 'reviewed' : ''}">
        <div class="mrc-header">
          <div class="mrc-info">
            <h4>${s.name || 'Student'} — ${formatDate(r.date)}</h4>
            <p>${s.rollNumber || ''} ${s.college ? '· ' + s.college : ''} · ⏱ ${r.hoursWorked || 0}h · ${tasks.length} tasks</p>
          </div>
          <div class="mrc-actions">
            <span class="rc-badge ${r.isReviewed ? 'reviewed-badge' : 'pending-badge'}">${r.isReviewed ? '✅ Reviewed' : '⏳ Pending'}</span>
            <button class="btn-view" onclick="showReportDetailEncoded('${encoded}')">👁 View</button>
            <button class="btn-dl" onclick="downloadReportById('${r._id}', '${r.student._id}')">⬇ Excel</button>
            <button class="btn-feedback" onclick="openFeedbackModal('${r._id}', '${(r.mentorFeedback || '').replace(/'/g, '')}', ${r.mentorRating || 0})">
              ${r.isReviewed ? '✏️ Edit' : '💬 Review'}
            </button>
          </div>
        </div>
        <div style="font-size:13px;color:var(--text-muted)">${tasks.slice(0, 3).map(t => `• ${t.title}`).join('  ')}</div>
        ${r.isReviewed && r.mentorFeedback ? `<div class="rc-feedback" style="margin-top:8px">"${r.mentorFeedback.substring(0, 100)}..."</div>` : ''}
      </div>`;
  }).join('');
}

// Download individual report by ID directly (from mentor list)
function downloadReportById(reportId, studentId) {
  downloadExcel(`${API}/export/excel?studentId=${studentId}`, `student_reports.xlsx`);
}

function exportExcelMentor() {
  const studentId = $('filter-student').value;
  const url = studentId ? `${API}/export/excel?studentId=${studentId}` : `${API}/export/excel`;
  downloadExcel(url, 'internship_reports.xlsx');
}

// ── Feedback Modal ─────────────────────────────
function openFeedbackModal(reportId, existingFeedback = '', existingRating = 0) {
  $('feedback-report-id').value = reportId;
  $('feedback-text').value = existingFeedback;
  currentRating = existingRating;
  updateStars(existingRating);
  $('feedback-modal').classList.remove('hidden');
}

function closeFeedbackModal() {
  $('feedback-modal').classList.add('hidden');
  currentRating = 0;
  updateStars(0);
}

function setRating(val) {
  currentRating = val;
  updateStars(val);
}

function updateStars(val) {
  document.querySelectorAll('.star').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.val) <= val);
  });
}

async function submitFeedback() {
  const reportId = $('feedback-report-id').value;
  const feedback = $('feedback-text').value;
  if (!feedback.trim()) return showError('feedback-error', 'Please write some feedback.');
  if (!currentRating) return showError('feedback-error', 'Please give a rating.');
  try {
    await api(`/reports/${reportId}/feedback`, 'PATCH', {
      mentorFeedback: feedback,
      mentorRating: currentRating
    });
    closeFeedbackModal();
    loadAllReports();
    initMentorDash();
  } catch (err) {
    showError('feedback-error', err.message);
  }
}

// ── Report Detail Modal ────────────────────────
// Safe encoded version — avoids issues with special chars in onclick
function showReportDetailEncoded(encoded) {
  try {
    const r = JSON.parse(decodeURIComponent(encoded));
    showReportDetail(r);
  } catch (e) { console.error('Parse error', e); }
}

function showReportDetail(r) {
  currentDetailReport = r; // store for download button
  const s = r.student || {};
  $('detail-title').textContent = `📄 Report — ${formatDate(r.date)}`;

  const tasksHtml = (r.tasks || []).map(t => `
    <div class="detail-task">
      <strong>${t.title}</strong>
      ${t.description ? `<span>${t.description}</span>` : ''}
      <span style="margin-top:4px;">${t.duration ? '⏱ ' + t.duration : ''} ${t.status ? '· ' + t.status : ''}</span>
    </div>`).join('');

  $('detail-content').innerHTML = `
    ${s.name ? `
    <div class="detail-section">
      <h4>Student</h4>
      <p>${s.name} ${s.rollNumber ? '(' + s.rollNumber + ')' : ''} ${s.college ? '— ' + s.college : ''}</p>
    </div>` : ''}
    <div class="detail-section">
      <h4>Date & Hours</h4>
      <p>${formatDate(r.date)} &nbsp;·&nbsp; ⏱ ${r.hoursWorked || 0} hours worked</p>
    </div>
    <div class="detail-section">
      <h4>Tasks Completed (${(r.tasks || []).length})</h4>
      ${tasksHtml || '<p style="color:var(--text-muted)">No tasks recorded.</p>'}
    </div>
    ${r.nextDayPlan ? `
    <div class="detail-section">
      <h4>Tomorrow's Plan</h4>
      <p>${r.nextDayPlan}</p>
    </div>` : ''}
    ${r.isReviewed ? `
    <hr style="border-color:var(--border);margin:16px 0"/>
    <div class="detail-section">
      <h4>Mentor Feedback</h4>
      <p>${r.mentorFeedback || '—'}</p>
      ${r.mentorRating ? `<p style="color:var(--amber);margin-top:8px;font-size:20px">${'★'.repeat(r.mentorRating)}${'☆'.repeat(5 - r.mentorRating)}</p>` : ''}
    </div>` : `
    <hr style="border-color:var(--border);margin:16px 0"/>
    <p style="font-size:13px;color:var(--text-muted);font-style:italic;">⏳ Awaiting mentor review...</p>`}`;

  $('detail-modal').classList.remove('hidden');
}

function closeDetailModal() {
  $('detail-modal').classList.add('hidden');
  currentDetailReport = null;
}

// ── Edit Profile ───────────────────────────────
function openEditProfile() {
  const u = user();
  $('edit-name').value = u.name || '';
  $('edit-email').value = u.email || '';
  $('edit-password').value = '';
  $('edit-confirm-password').value = '';

  if (u.role === 'student') {
    $('edit-student-fields').classList.remove('hidden');
    $('edit-mentor-fields').classList.add('hidden');
    $('edit-roll').value = u.rollNumber || '';
    $('edit-college').value = u.college || '';
    $('edit-internship').value = u.internshipTitle || '';
  } else {
    $('edit-student-fields').classList.add('hidden');
    $('edit-mentor-fields').classList.remove('hidden');
    $('edit-org').value = u.organization || '';
    $('edit-designation').value = u.designation || '';
  }
  $('edit-profile-modal').classList.remove('hidden');
}

function closeEditProfile() {
  $('edit-profile-modal').classList.add('hidden');
}

async function saveProfile(e) {
  e.preventDefault();
  hideMsg('edit-profile-error');
  hideMsg('edit-profile-success');

  const newPass = $('edit-password').value;
  const confirmPass = $('edit-confirm-password').value;
  if (newPass && newPass !== confirmPass) {
    return showError('edit-profile-error', 'Passwords do not match.');
  }

  const u = user();
  const payload = {
    name: $('edit-name').value,
    email: $('edit-email').value
  };
  if (u.role === 'student') {
    payload.rollNumber = $('edit-roll').value;
    payload.college = $('edit-college').value;
    payload.internshipTitle = $('edit-internship').value;
  } else {
    payload.organization = $('edit-org').value;
    payload.designation = $('edit-designation').value;
  }
  if (newPass) payload.password = newPass;

  setLoading('save-profile-btn', true);
  try {
    const updated = await api('/auth/profile', 'PUT', payload);
    const updatedUser = { ...u, ...updated };
    localStorage.setItem('il_user', JSON.stringify(updatedUser));
    $('student-name-nav').textContent = updatedUser.name;
    $('mentor-name-nav').textContent = updatedUser.name;
    showSuccess('edit-profile-success', '✅ Profile updated successfully!');
    setTimeout(() => closeEditProfile(), 1500);
  } catch (err) {
    showError('edit-profile-error', err.message);
  } finally {
    setLoading('save-profile-btn', false);
  }
}

// ── Auto Login on Page Load ────────────────────
window.addEventListener('load', () => {
  const u = user();
  if (u && token()) {
    initApp(u);
  } else {
    $('auth-screen').classList.add('active');
  }
});
