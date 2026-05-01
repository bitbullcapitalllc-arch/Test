'use strict';

const STORE_KEY = 'taskflow_v2';

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify({ tasks: st.tasks, sprints: st.sprints }));
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    st.tasks   = Array.isArray(d.tasks)   ? d.tasks   : [];
    st.sprints = Array.isArray(d.sprints) ? d.sprints : [];
    if (!st.tasks.length && !st.sprints.length) seed();
  } catch { seed(); }
}

const st = {
  tasks: [], sprints: [],
  view: 'board', selectedSprint: null,
  editingTask: null, editingSprint: null,
  sprintType: 'weekly',
  filters: { priority: 'all', status: 'all', search: '' },
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().split('T')[0];

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function sprintEnd(start, type) {
  if (type === 'daily')   return addDays(start, 1);
  if (type === 'weekly')  return addDays(start, 7);
  if (type === 'monthly') return addDays(start, 30);
  return addDays(start, 7);
}

function daysLeft(end) {
  return Math.ceil((new Date(end + 'T23:59:59') - Date.now()) / 86400000);
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(d) {
  return d && new Date(d + 'T23:59:59') < Date.now();
}

function addTask(data) {
  const t = {
    id: uid(), title: data.title, description: data.description || '',
    status: data.status || 'todo', priority: data.priority || 'medium',
    sprintId: data.sprintId || null, storyPoints: Number(data.storyPoints) || 1,
    labels: data.labels || [], assignee: data.assignee || '',
    dueDate: data.dueDate || null, createdAt: new Date().toISOString(),
  };
  st.tasks.unshift(t); save(); return t.id;
}

function editTask(id, patch) {
  const i = st.tasks.findIndex(t => t.id === id);
  if (i < 0) return;
  st.tasks[i] = { ...st.tasks[i], ...patch }; save();
}

function removeTask(id) { st.tasks = st.tasks.filter(t => t.id !== id); save(); }

function addSprint(data) {
  const start = data.startDate || today();
  const sp = {
    id: uid(), name: data.name, type: data.type || 'weekly',
    startDate: start, endDate: sprintEnd(start, data.type || 'weekly'),
    goal: data.goal || '', status: data.status || 'planned',
  };
  st.sprints.push(sp); save(); return sp.id;
}

function editSprint(id, patch) {
  const i = st.sprints.findIndex(s => s.id === id);
  if (i < 0) return;
  st.sprints[i] = { ...st.sprints[i], ...patch };
  const s = st.sprints[i];
  st.sprints[i].endDate = sprintEnd(s.startDate, s.type);
  save();
}

function removeSprint(id) {
  st.tasks.forEach(t => { if (t.sprintId === id) editTask(t.id, { sprintId: null }); });
  st.sprints = st.sprints.filter(s => s.id !== id); save();
}

function seed() {
  const s1 = addSprint({ name: 'Sprint 1',   type: 'weekly',  startDate: today(), goal: 'Ship the MVP',        status: 'active'  });
  const s2 = addSprint({ name: 'Daily Fix',  type: 'daily',   startDate: today(), goal: 'Patch critical bugs', status: 'active'  });
  addSprint({            name: 'Q2 Plan',    type: 'monthly', startDate: today(), goal: 'Roadmap for Q2',     status: 'planned' });
  [
    { title: 'Set up CI/CD pipeline',      description: 'Configure GitHub Actions',          priority: 'high',     status: 'done',       sprintId: s1, storyPoints: 5, labels: ['devops'],        assignee: 'Alex'   },
    { title: 'Design system docs',         description: 'Document components & tokens',      priority: 'medium',   status: 'inreview',   sprintId: s1, storyPoints: 3, labels: ['docs','design'],  assignee: 'Sam'    },
    { title: 'User authentication flow',   description: 'OAuth 2.0 with Google & GitHub',    priority: 'critical', status: 'inprogress', sprintId: s1, storyPoints: 8, labels: ['auth','security'], assignee: 'Jordan' },
    { title: 'Fix login redirect bug',     description: 'Redirect not firing after login',   priority: 'critical', status: 'inprogress', sprintId: s2, storyPoints: 2, labels: ['bug'],             assignee: 'Alex'   },
    { title: 'Dashboard analytics widget', description: 'Charts for key metrics',             priority: 'medium',   status: 'todo',       sprintId: s1, storyPoints: 3, labels: ['feature'],        assignee: 'Sam'    },
    { title: 'Mobile responsive layout',   description: 'All pages work on mobile',          priority: 'high',     status: 'todo',       sprintId: s2, storyPoints: 5, labels: ['mobile','ui'],     assignee: 'Jordan' },
    { title: 'Performance optimisation',   description: 'Lazy loading & bundle splitting',   priority: 'high',     status: 'todo',       sprintId: s1, storyPoints: 5, labels: ['performance'],    assignee: ''       },
    { title: 'API rate limiting',          description: 'Prevent abuse with rate limits',    priority: 'low',      status: 'todo',       sprintId: null, storyPoints: 3, labels: ['api'],           assignee: ''       },
    { title: 'Email notifications',        description: 'Alerts for important events',       priority: 'medium',   status: 'todo',       sprintId: null, storyPoints: 5, labels: ['feature'],        assignee: ''       },
    { title: 'Data export (CSV/JSON)',     description: 'Let users export their data',       priority: 'low',      status: 'todo',       sprintId: null, storyPoints: 3, labels: ['feature'],        assignee: ''       },
  ].forEach(t => addTask(t));
}

function applyFilters(tasks) {
  return tasks.filter(t => {
    if (st.filters.priority !== 'all' && t.priority !== st.filters.priority) return false;
    if (st.filters.status   !== 'all' && t.status   !== st.filters.status)   return false;
    if (st.filters.search) {
      const q = st.filters.search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function boardTasks() {
  const pool = st.selectedSprint ? st.tasks.filter(t => t.sprintId === st.selectedSprint) : st.tasks;
  return applyFilters(pool);
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const TYPE_COLORS  = { daily: '#06b6d4', weekly: '#8b5cf6', monthly: '#ec4899' };
const STATUS_LABELS = { todo: 'To Do', inprogress: 'In Progress', inreview: 'In Review', done: 'Done' };
const NEXT_STATUS   = { todo: 'inprogress', inprogress: 'inreview', inreview: 'done', done: 'todo' };
const NEXT_LABEL    = { todo: 'Start', inprogress: 'Review', inreview: 'Done', done: 'Reopen' };

function renderSidebar() {
  const el = document.getElementById('sprint-list');
  let html = `<div class="sp-item ${!st.selectedSprint ? 'active' : ''}" data-sid="__all__"><div class="sp-dot" style="background:var(--text-3)"></div><div class="sp-info"><div class="sp-name">All Tasks</div><div class="sp-sub">${st.tasks.length} tasks</div></div></div>`;
  for (const sp of st.sprints) {
    const cnt = st.tasks.filter(t => t.sprintId === sp.id).length;
    html += `<div class="sp-item ${st.selectedSprint === sp.id ? 'active' : ''}" data-sid="${sp.id}"><div class="sp-dot" style="background:${TYPE_COLORS[sp.type]}"></div><div class="sp-info"><div class="sp-name">${esc(sp.name)}</div><div class="sp-sub">${cnt} tasks · ${sp.type}</div></div><span class="sp-badge sp-badge-${sp.status}">${sp.status}</span></div>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('.sp-item').forEach(item => item.addEventListener('click', () => {
    st.selectedSprint = item.dataset.sid === '__all__' ? null : item.dataset.sid;
    renderAll();
  }));
}

function renderBoard() {
  const sp = st.selectedSprint ? st.sprints.find(s => s.id === st.selectedSprint) : null;
  document.getElementById('board-title').textContent = sp ? sp.name : 'All Tasks';
  const tasks = boardTasks();
  ['todo','inprogress','inreview','done'].forEach(status => {
    const col = tasks.filter(t => t.status === status);
    document.getElementById('count-' + status).textContent = col.length;
    const el = document.getElementById('col-' + status);
    el.innerHTML = col.length ? col.map(taskCardHTML).join('') : '<div class="empty"><div class="empty-text">No tasks</div></div>';
    attachCardEvents(el);
  });
}

function taskCardHTML(t) {
  const labels = t.labels.slice(0,3).map(l => `<span class="label-chip">${esc(l)}</span>`).join('');
  const avatar = t.assignee ? `<div class="assignee-avatar">${esc(t.assignee[0].toUpperCase())}<span class="tip">${esc(t.assignee)}</span></div>` : '';
  const due    = t.dueDate  ? `<span class="due-label ${isOverdue(t.dueDate) && t.status !== 'done' ? 'overdue' : ''}">${fmtDate(t.dueDate)}</span>` : '';
  return `<div class="task-card priority-${t.priority}" draggable="true" data-id="${t.id}"><div class="card-actions"><button class="card-action edit" data-id="${t.id}" title="Edit">✎</button><button class="card-action del" data-id="${t.id}" title="Delete">✕</button></div><div class="card-title">${esc(t.title)}</div><div class="card-meta"><span class="pri-badge ${t.priority}">${t.priority}</span><span class="pts-badge">${t.storyPoints}pt</span>${labels}</div><div class="card-footer">${avatar}${due}<button class="advance-btn" data-id="${t.id}">${NEXT_LABEL[t.status]} →</button></div></div>`;
}

function attachCardEvents(container) {
  container.querySelectorAll('.task-card[draggable]').forEach(card => {
    card.addEventListener('dragstart', e => { e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', card.dataset.id); card.classList.add('dragging'); });
    card.addEventListener('dragend',   () => card.classList.remove('dragging'));
  });
  container.querySelectorAll('.task-card').forEach(card =>
    card.addEventListener('click', e => { if (!e.target.closest('.card-action,.advance-btn')) openEditTask(card.dataset.id); }));
  container.querySelectorAll('.card-action.edit').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); openEditTask(btn.dataset.id); }));
  container.querySelectorAll('.card-action.del').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); confirmDeleteTask(btn.dataset.id); }));
  container.querySelectorAll('.advance-btn').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); advanceTask(btn.dataset.id); }));
}

function initDropZones() {
  document.querySelectorAll('.col-tasks').forEach(zone => {
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const col = zone.closest('.board-column');
      if (!id || !col) return;
      editTask(id, { status: col.dataset.status }); renderAll();
    });
  });
}

function renderBacklog() {
  const el = document.getElementById('backlog-list');
  const sections = [];
  st.sprints.filter(s => s.status !== 'completed').forEach(sp =>
    sections.push({ label: sp.name, badge: sp.type, tasks: applyFilters(st.tasks.filter(t => t.sprintId === sp.id)) }));
  sections.push({ label: 'Backlog', badge: null, tasks: applyFilters(st.tasks.filter(t => !t.sprintId)) });
  if (sections.every(s => !s.tasks.length)) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">No tasks yet — create your first one!</div></div>';
    return;
  }
  el.innerHTML = sections.filter(s => s.tasks.length).map(sec => `<div class="bl-section"><div class="bl-section-head"><h4>${esc(sec.label)}</h4>${sec.badge ? `<span class="type-tag ${sec.badge}">${sec.badge}</span>` : ''}<span class="bl-task-count">${sec.tasks.length} task${sec.tasks.length !== 1 ? 's' : ''}</span></div>${sec.tasks.map(blRowHTML).join('')}</div>`).join('');
  el.querySelectorAll('.bl-row').forEach(row => {
    row.querySelector('.del-bl')?.addEventListener('click', e => { e.stopPropagation(); confirmDeleteTask(row.dataset.id); });
    row.addEventListener('click', e => { if (!e.target.closest('.del-bl')) openEditTask(row.dataset.id); });
  });
}

function blRowHTML(t) {
  return `<div class="bl-row" data-id="${t.id}"><span class="pri-badge ${t.priority}">${t.priority}</span><span class="bl-title">${esc(t.title)}</span><div class="bl-meta">${t.assignee ? `<span style="font-size:12px;color:var(--text-3)">${esc(t.assignee)}</span>` : ''}<span class="pts-badge">${t.storyPoints}pt</span><span class="status-chip ${t.status}">${STATUS_LABELS[t.status]}</span><button class="btn btn-sm btn-ghost del-bl" style="padding:2px 6px">✕</button></div></div>`;
}

function renderSprints() {
  const el = document.getElementById('sprints-list');
  if (!st.sprints.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">🚀</div><div class="empty-text">No sprints yet!</div></div>'; return; }
  const ORDER = { active: 0, planned: 1, completed: 2 };
  el.innerHTML = [...st.sprints].sort((a,b) => ORDER[a.status]-ORDER[b.status]).map(sprintCardHTML).join('');
  el.querySelectorAll('[data-sp-start]').forEach(btn    => btn.addEventListener('click', () => { editSprint(btn.dataset.spStart, { status: 'active' }); renderAll(); }));
  el.querySelectorAll('[data-sp-complete]').forEach(btn => btn.addEventListener('click', () => { editSprint(btn.dataset.spComplete, { status: 'completed' }); renderAll(); }));
  el.querySelectorAll('[data-sp-edit]').forEach(btn     => btn.addEventListener('click', () => openEditSprint(btn.dataset.spEdit)));
  el.querySelectorAll('[data-sp-del]').forEach(btn      => btn.addEventListener('click', () => confirmDeleteSprint(btn.dataset.spDel)));
  el.querySelectorAll('.sc-chip[data-task-id]').forEach(chip  => chip.addEventListener('click', () => openEditTask(chip.dataset.taskId)));
  el.querySelectorAll('.sc-chip[data-more-sid]').forEach(chip => chip.addEventListener('click', () => { st.selectedSprint = chip.dataset.moreSid; switchView('board'); }));
}

function sprintCardHTML(sp) {
  const tasks = st.tasks.filter(t => t.sprintId === sp.id);
  const done  = tasks.filter(t => t.status === 'done');
  const pct   = tasks.length ? Math.round(done.length/tasks.length*100) : 0;
  const left  = daysLeft(sp.endDate);
  const totalPts = tasks.reduce((s,t) => s+t.storyPoints, 0);
  const donePts  = done.reduce((s,t)  => s+t.storyPoints, 0);
  const action   = sp.status === 'planned'   ? `<button class="btn btn-sm btn-primary" data-sp-start="${sp.id}">Start Sprint</button>`
                 : sp.status === 'active'    ? `<button class="btn btn-sm btn-success" data-sp-complete="${sp.id}">Complete</button>`
                 : `<span class="status-tag completed">Completed</span>`;
  const chips    = tasks.slice(0,5).map(t => `<div class="sc-chip" data-task-id="${t.id}"><span class="pri-badge ${t.priority}" style="font-size:9px;padding:1px 4px">${t.priority[0].toUpperCase()}</span>${esc(t.title.length>32?t.title.slice(0,32)+'…':t.title)}</div>`).join('');
  const more     = tasks.length > 5 ? `<div class="sc-chip" data-more-sid="${sp.id}">+${tasks.length-5} more</div>` : '';
  const leftVal  = left < 0 ? 'Overdue' : left === 0 ? 'Today' : `${left}d`;
  const leftCls  = left < 0 ? 'danger' : left <= 2 ? 'warn' : '';
  return `<div class="sprint-card"><div class="sc-head"><div class="sc-title"><span class="type-tag ${sp.type}">${sp.type}</span><span class="sc-name">${esc(sp.name)}</span><span class="status-tag ${sp.status}">${sp.status}</span></div><div class="sc-actions">${action}<button class="btn btn-sm btn-ghost" data-sp-edit="${sp.id}">Edit</button><button class="btn btn-sm btn-danger" data-sp-del="${sp.id}">Delete</button></div></div>${sp.goal ? `<div class="sc-goal">🎯 ${esc(sp.goal)}</div>` : ''}<div class="sc-stats"><div class="sc-stat"><div class="sc-stat-label">Start</div><div class="sc-stat-value">${fmtDate(sp.startDate)}</div></div><div class="sc-stat"><div class="sc-stat-label">End</div><div class="sc-stat-value">${fmtDate(sp.endDate)}</div></div><div class="sc-stat"><div class="sc-stat-label">Days Left</div><div class="sc-stat-value ${leftCls}">${leftVal}</div></div><div class="sc-stat"><div class="sc-stat-label">Tasks</div><div class="sc-stat-value">${done.length}/${tasks.length}</div></div><div class="sc-stat"><div class="sc-stat-label">Points</div><div class="sc-stat-value">${donePts}/${totalPts}</div></div><div class="sc-stat"><div class="sc-stat-label">Progress</div><div class="sc-stat-value">${pct}%</div></div></div><div class="sc-progress"><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div></div>${tasks.length ? `<div class="sc-chips">${chips}${more}</div>` : ''}</div>`;
}

function openCreateTask() {
  st.editingTask = null;
  document.getElementById('task-modal-heading').textContent = 'Create Task';
  document.getElementById('task-save-btn').textContent      = 'Create Task';
  ['t-title','t-desc','t-assignee','t-due','t-labels'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('t-status').value   = 'todo';
  document.getElementById('t-priority').value = 'medium';
  document.getElementById('t-points').value   = '1';
  fillSprintSelect(st.selectedSprint);
  document.getElementById('task-modal').classList.remove('hidden');
  document.getElementById('t-title').focus();
}

function openEditTask(id) {
  const t = st.tasks.find(x => x.id === id);
  if (!t) return;
  st.editingTask = id;
  document.getElementById('task-modal-heading').textContent = 'Edit Task';
  document.getElementById('task-save-btn').textContent      = 'Save Changes';
  document.getElementById('t-title').value    = t.title;
  document.getElementById('t-desc').value     = t.description;
  document.getElementById('t-status').value   = t.status;
  document.getElementById('t-priority').value = t.priority;
  document.getElementById('t-points').value   = t.storyPoints;
  document.getElementById('t-assignee').value = t.assignee || '';
  document.getElementById('t-due').value      = t.dueDate || '';
  document.getElementById('t-labels').value   = (t.labels || []).join(', ');
  fillSprintSelect(t.sprintId);
  document.getElementById('task-modal').classList.remove('hidden');
  document.getElementById('t-title').focus();
}

function fillSprintSelect(selectedId) {
  const sel = document.getElementById('t-sprint');
  sel.innerHTML = '<option value="">Backlog (no sprint)</option>';
  st.sprints.filter(s => s.status !== 'completed').forEach(s => {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = `${s.name} (${s.type})`;
    if (s.id === selectedId) o.selected = true;
    sel.appendChild(o);
  });
}

function closeTaskModal() { document.getElementById('task-modal').classList.add('hidden'); st.editingTask = null; }

function saveTaskModal() {
  const titleEl = document.getElementById('t-title');
  const title = titleEl.value.trim();
  if (!title) { titleEl.classList.add('error'); titleEl.focus(); return; }
  titleEl.classList.remove('error');
  const data = {
    title, description: document.getElementById('t-desc').value.trim(),
    status: document.getElementById('t-status').value, priority: document.getElementById('t-priority').value,
    sprintId: document.getElementById('t-sprint').value || null,
    storyPoints: parseInt(document.getElementById('t-points').value) || 1,
    assignee: document.getElementById('t-assignee').value.trim(),
    dueDate: document.getElementById('t-due').value || null,
    labels: document.getElementById('t-labels').value.split(',').map(s => s.trim()).filter(Boolean),
  };
  if (st.editingTask) editTask(st.editingTask, data); else addTask(data);
  closeTaskModal(); renderAll();
}

function openCreateSprint() {
  st.editingSprint = null;
  document.getElementById('sprint-modal-heading').textContent = 'Create Sprint';
  document.getElementById('sprint-save-btn').textContent      = 'Create Sprint';
  document.getElementById('s-name').value  = `Sprint ${st.sprints.length + 1}`;
  document.getElementById('s-start').value = today();
  document.getElementById('s-goal').value  = '';
  st.sprintType = 'weekly'; syncTypeButtons();
  document.getElementById('sprint-modal').classList.remove('hidden');
  document.getElementById('s-name').focus();
}

function openEditSprint(id) {
  const sp = st.sprints.find(s => s.id === id);
  if (!sp) return;
  st.editingSprint = id;
  document.getElementById('sprint-modal-heading').textContent = 'Edit Sprint';
  document.getElementById('sprint-save-btn').textContent      = 'Save Changes';
  document.getElementById('s-name').value  = sp.name;
  document.getElementById('s-start').value = sp.startDate;
  document.getElementById('s-goal').value  = sp.goal || '';
  st.sprintType = sp.type; syncTypeButtons();
  document.getElementById('sprint-modal').classList.remove('hidden');
}

function syncTypeButtons() {
  document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === st.sprintType));
}

function closeSprintModal() { document.getElementById('sprint-modal').classList.add('hidden'); st.editingSprint = null; }

function saveSprintModal() {
  const nameEl = document.getElementById('s-name');
  const name = nameEl.value.trim();
  if (!name) { nameEl.classList.add('error'); nameEl.focus(); return; }
  nameEl.classList.remove('error');
  const data = { name, type: st.sprintType, startDate: document.getElementById('s-start').value || today(), goal: document.getElementById('s-goal').value.trim() };
  if (st.editingSprint) editSprint(st.editingSprint, data); else addSprint(data);
  closeSprintModal(); renderAll();
}

function advanceTask(id) {
  const t = st.tasks.find(x => x.id === id);
  if (!t) return;
  editTask(id, { status: NEXT_STATUS[t.status] }); renderAll();
}

function confirmDeleteTask(id) {
  if (confirm('Delete this task?')) { removeTask(id); renderAll(); }
}

function confirmDeleteSprint(id) {
  const sp = st.sprints.find(s => s.id === id);
  if (!sp) return;
  const cnt = st.tasks.filter(t => t.sprintId === id).length;
  if (!confirm(cnt ? `Delete "${sp.name}"? ${cnt} task(s) will move to Backlog.` : `Delete "${sp.name}"?`)) return;
  if (st.selectedSprint === id) st.selectedSprint = null;
  removeSprint(id); renderAll();
}

function switchView(v) {
  st.view = v;
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  document.getElementById(v + '-view').classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === v));
  if (v === 'board')   renderBoard();
  if (v === 'backlog') renderBacklog();
  if (v === 'sprints') renderSprints();
}

function renderAll() {
  renderSidebar();
  if (st.view === 'board')   renderBoard();
  if (st.view === 'backlog') renderBacklog();
  if (st.view === 'sprints') renderSprints();
}

function initEvents() {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  document.getElementById('new-task-btn').addEventListener('click', openCreateTask);
  document.getElementById('new-sprint-btn').addEventListener('click', openCreateSprint);
  document.getElementById('task-modal-close').addEventListener('click', closeTaskModal);
  document.getElementById('task-cancel-btn').addEventListener('click', closeTaskModal);
  document.getElementById('task-save-btn').addEventListener('click', saveTaskModal);
  document.getElementById('task-backdrop').addEventListener('click', closeTaskModal);
  document.getElementById('sprint-modal-close').addEventListener('click', closeSprintModal);
  document.getElementById('sprint-cancel-btn').addEventListener('click', closeSprintModal);
  document.getElementById('sprint-save-btn').addEventListener('click', saveSprintModal);
  document.getElementById('sprint-backdrop').addEventListener('click', closeSprintModal);
  document.querySelectorAll('.type-btn').forEach(btn => btn.addEventListener('click', () => { st.sprintType = btn.dataset.type; syncTypeButtons(); }));
  document.getElementById('board-priority-filter').addEventListener('change', e => { st.filters.priority = e.target.value; renderAll(); });
  document.getElementById('bl-status-filter').addEventListener('change',   e => { st.filters.status   = e.target.value; renderAll(); });
  document.getElementById('bl-priority-filter').addEventListener('change', e => { st.filters.priority = e.target.value; renderAll(); });
  document.getElementById('search-input').addEventListener('input', e => { st.filters.search = e.target.value; renderAll(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeTaskModal(); closeSprintModal(); }
    if ((e.metaKey||e.ctrlKey) && e.key === 'n') { e.preventDefault(); openCreateTask(); }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  initDropZones();
  initEvents();
  const active = st.sprints.find(s => s.status === 'active');
  st.selectedSprint = active?.id ?? null;
  renderAll();
});
