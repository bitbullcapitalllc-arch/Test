const STATUSES = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

const STORAGE_KEY = 'task-tracker-board-v1';

const boardEl = document.getElementById('board');
const dialog = document.getElementById('task-dialog');
const taskForm = document.getElementById('task-form');
const taskTemplate = document.getElementById('task-template');
const newTaskBtn = document.getElementById('new-task-btn');

let tasks = loadTasks();

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedTasks();

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedTasks();
  } catch {
    return seedTasks();
  }
}

function seedTasks() {
  return [
    {
      id: crypto.randomUUID(),
      title: 'Design backlog for sprint',
      description: 'Collect and prioritize tasks for this sprint planning.',
      assignee: 'Priya',
      priority: 'High',
      status: 'todo',
    },
    {
      id: crypto.randomUUID(),
      title: 'Implement auth flow',
      description: 'Support sign-in, sign-up, and reset password pages.',
      assignee: 'Arun',
      priority: 'Critical',
      status: 'in_progress',
    },
    {
      id: crypto.randomUUID(),
      title: 'Review pull request #82',
      description: 'Validate acceptance criteria and regression notes.',
      assignee: 'Maya',
      priority: 'Medium',
      status: 'review',
    },
  ];
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function renderBoard() {
  boardEl.innerHTML = '';

  for (const column of STATUSES) {
    const columnEl = document.createElement('section');
    columnEl.className = 'column';

    const count = tasks.filter((t) => t.status === column.key).length;
    columnEl.innerHTML = `<h2>${column.label} <span class="count">${count}</span></h2>`;

    const dropZone = document.createElement('div');
    dropZone.className = 'drop-zone';
    dropZone.dataset.status = column.key;

    dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropZone.classList.remove('drag-over');

      const taskId = event.dataTransfer.getData('text/plain');
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      task.status = column.key;
      persist();
      renderBoard();
    });

    const columnTasks = tasks.filter((task) => task.status === column.key);
    for (const task of columnTasks) {
      dropZone.appendChild(renderTaskCard(task));
    }

    columnEl.appendChild(dropZone);
    boardEl.appendChild(columnEl);
  }
}

function renderTaskCard(task) {
  const fragment = taskTemplate.content.cloneNode(true);
  const card = fragment.querySelector('.task-card');

  card.dataset.id = task.id;

  const title = fragment.querySelector('.task-title');
  const description = fragment.querySelector('.task-description');
  const priority = fragment.querySelector('.priority');
  const assignee = fragment.querySelector('.assignee');
  const deleteBtn = fragment.querySelector('.delete-btn');

  title.textContent = task.title;
  description.textContent = task.description || 'No description';
  priority.textContent = task.priority;
  priority.classList.add(task.priority.toLowerCase());
  assignee.textContent = task.assignee ? `@${task.assignee}` : 'Unassigned';

  card.addEventListener('dragstart', (event) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
  });

  deleteBtn.addEventListener('click', () => {
    tasks = tasks.filter((t) => t.id !== task.id);
    persist();
    renderBoard();
  });

  return fragment;
}

newTaskBtn.addEventListener('click', () => {
  taskForm.reset();
  dialog.showModal();
});

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(taskForm);

  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const assignee = String(formData.get('assignee') || '').trim();
  const priority = String(formData.get('priority') || 'Medium');

  if (!title) return;

  tasks.unshift({
    id: crypto.randomUUID(),
    title,
    description,
    assignee,
    priority,
    status: 'todo',
  });

  persist();
  renderBoard();
  dialog.close();
});

persist();
renderBoard();
