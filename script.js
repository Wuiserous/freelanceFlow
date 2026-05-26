const STORAGE_KEY = "freelanceflow.dashboard.v2";

const clientLookup = new Map();
const projectLookup = new Map();
const taskLookup = new Map();

const defaultState = {
  invoiceFilter: "all",
  searchQuery: "",
  timer: {
    active: false,
    startedAt: null,
    projectId: 1,
    taskId: 101,
    elapsedMs: 0
  },
  projects: [
    {
      id: 1,
      name: "Portfolio refresh",
      clientId: 1,
      deadline: "2026-06-05",
      budget: 1200,
      status: "In Progress",
      tasks: [
        { id: 101, title: "Homepage cleanup", status: "In Progress", deadline: "2026-05-29", estimate: 4 },
        { id: 102, title: "Mobile polish", status: "Pending", deadline: "2026-06-02", estimate: 3 }
      ]
    },
    {
      id: 2,
      name: "Invoice dashboard",
      clientId: 2,
      deadline: "2026-06-10",
      budget: 900,
      status: "Pending",
      tasks: [
        { id: 201, title: "Layout draft", status: "Completed", deadline: "2026-05-22", estimate: 2 },
        { id: 202, title: "Billing table", status: "Pending", deadline: "2026-06-06", estimate: 4 }
      ]
    }
  ],
  clients: [
    {
      id: 1,
      name: "Ava Reed",
      company: "Reed Studio",
      email: "ava@reedstudio.com",
      phone: "+1 415 555 0182",
      lastContact: "2026-05-24",
      notes: "Prefers short weekly updates."
    },
    {
      id: 2,
      name: "Noah Kim",
      company: "Northline",
      email: "noah@northline.co",
      phone: "+1 212 555 0107",
      lastContact: "2026-05-25",
      notes: "Invoice at milestone completion."
    }
  ],
  invoices: [
    { id: "FF-201", clientId: 1, projectId: 1, amount: 600, status: "Paid" },
    { id: "FF-202", clientId: 2, projectId: 2, amount: 900, status: "Pending" }
  ],
  timeEntries: [
    { id: 1, projectId: 1, taskId: 101, date: "2026-05-25", duration: 2.0 },
    { id: 2, projectId: 2, taskId: 201, date: "2026-05-24", duration: 1.5 }
  ]
};

const els = {};
let state = structuredClone(defaultState);
let timerTick = null;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric"
});

function $(id) {
  return document.getElementById(id);
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    state = {
      ...structuredClone(defaultState),
      ...parsed,
      timer: { ...structuredClone(defaultState.timer), ...(parsed.timer || {}) }
    };
  } catch {
    state = structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function buildLookups() {
  clientLookup.clear();
  projectLookup.clear();
  taskLookup.clear();

  for (const client of state.clients) clientLookup.set(client.id, client);
  for (const project of state.projects) {
    projectLookup.set(project.id, project);
    for (const task of project.tasks) {
      taskLookup.set(task.id, { ...task, projectId: project.id });
    }
  }
}

function nextId(items, selector = (item) => item.id) {
  const ids = items.map(selector).filter((value) => Number.isFinite(Number(value)));
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  els.toastStack.appendChild(node);

  setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(8px)";
    setTimeout(() => node.remove(), 200);
  }, 2200);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function projectProgress(project) {
  const total = project.tasks.length || 1;
  const completed = project.tasks.filter((task) => task.status === "Completed").length;
  return Math.round((completed / total) * 100);
}

function projectHours(projectId) {
  return state.timeEntries
    .filter((entry) => entry.projectId === projectId)
    .reduce((sum, entry) => sum + entry.duration, 0);
}

function trackedHours() {
  return state.timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
}

function paidIncome() {
  return state.invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
}

function outstandingIncome() {
  return state.invoices
    .filter((invoice) => invoice.status !== "Paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
}

function filteredProjects() {
  const query = state.searchQuery.trim().toLowerCase();
  return state.projects.filter((project) => {
    const client = clientLookup.get(project.clientId);
    const text = `${project.name} ${client?.name || ""} ${project.status}`.toLowerCase();
    return !query || text.includes(query);
  });
}

function filteredClients() {
  const query = state.searchQuery.trim().toLowerCase();
  return state.clients.filter((client) => {
    const text = `${client.name} ${client.company} ${client.email}`.toLowerCase();
    return !query || text.includes(query);
  });
}

function filteredInvoices() {
  const query = state.searchQuery.trim().toLowerCase();
  return state.invoices.filter((invoice) => {
    const client = clientLookup.get(invoice.clientId);
    const text = `${invoice.id} ${client?.name || ""} ${invoice.status}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);
    const matchesStatus = state.invoiceFilter === "all" || invoice.status.toLowerCase() === state.invoiceFilter;
    return matchesQuery && matchesStatus;
  });
}

function renderStats() {
  els.incomeStat.textContent = currency.format(paidIncome());
  els.invoiceStat.textContent = currency.format(outstandingIncome());
  els.hoursStat.textContent = `${trackedHours().toFixed(1)}h`;
  els.planMeter.style.width = `${Math.min((state.projects.length / 10) * 100, 100)}%`;
}

function renderProjects() {
  const markup = filteredProjects().map((project) => {
    const client = clientLookup.get(project.clientId);
    const progress = projectProgress(project);

    return `
      <article class="project-card fade-in">
        <div class="project-top">
          <div>
            <h3 class="project-name">${escapeHtml(project.name)}</h3>
            <div class="project-meta">
              <span>${escapeHtml(client?.company || client?.name || "Client")}</span>
              <span>Due ${shortDate.format(new Date(project.deadline))}</span>
            </div>
          </div>
          <span class="status-chip" data-status="${escapeHtml(project.status)}">${escapeHtml(project.status)}</span>
        </div>
        <div class="progress"><span style="width:${progress}%"></span></div>
        <div class="task-list">
          ${project.tasks.slice(0, 2).map((task) => `
            <div class="task-row">
              <div>
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-meta">${task.estimate}h · ${shortDate.format(new Date(task.deadline))}</div>
              </div>
              <span class="status-chip" data-status="${escapeHtml(task.status)}">${escapeHtml(task.status)}</span>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }).join("");

  els.projectList.innerHTML = markup || `<div class="task-row">No matching projects.</div>`;
}

function renderClients() {
  const markup = filteredClients().map((client) => `
    <article class="client-card fade-in">
      <div class="client-row">
        <div>
          <h3>${escapeHtml(client.name)}</h3>
          <div class="task-meta">${escapeHtml(client.company)}</div>
        </div>
        <span class="live-badge">Active</span>
      </div>
      <div class="client-meta">
        <span>${escapeHtml(client.email)}</span>
        <span>${escapeHtml(client.phone)}</span>
        <span>${escapeHtml(client.notes)}</span>
      </div>
    </article>
  `).join("");

  els.clientGrid.innerHTML = markup || `<div class="task-row">No matching clients.</div>`;
}

function renderInvoices() {
  const markup = filteredInvoices().map((invoice) => {
    const client = clientLookup.get(invoice.clientId);
    return `
      <tr>
        <td>${escapeHtml(invoice.id)}</td>
        <td>${escapeHtml(client?.name || "Client")}</td>
        <td>${currency.format(invoice.amount)}</td>
        <td><span class="status-chip" data-status="${escapeHtml(invoice.status)}">${escapeHtml(invoice.status)}</span></td>
      </tr>
    `;
  }).join("");

  els.invoiceTable.innerHTML = markup || `<tr><td colspan="4">No matching invoices.</td></tr>`;
}

function renderTimerFields() {
  els.timerProject.innerHTML = state.projects.length
    ? state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("")
    : `<option value="">No projects</option>`;

  const currentProject = state.projects.find((project) => project.id === state.timer.projectId) || state.projects[0];
  els.timerProject.value = String(currentProject?.id || "");

  els.timerTask.innerHTML = currentProject?.tasks?.length
    ? currentProject.tasks.map((task) => `<option value="${task.id}">${escapeHtml(task.title)}</option>`).join("")
    : `<option value="">No tasks</option>`;

  els.timerTask.value = String(state.timer.taskId || currentProject?.tasks?.[0]?.id || "");
}

function updateTimerUI() {
  const elapsed = state.timer.active && state.timer.startedAt
    ? state.timer.elapsedMs + (Date.now() - state.timer.startedAt)
    : state.timer.elapsedMs;

  els.timerDisplay.textContent = formatDuration(elapsed);
  els.timerState.textContent = state.timer.active ? "Running" : "Idle";

  const project = projectLookup.get(state.timer.projectId);
  const task = taskLookup.get(state.timer.taskId);
  els.timerCaption.textContent = project && task
    ? `${project.name} · ${task.title}`
    : "Select a project and task to start.";
}

function startTimer() {
  if (state.timer.active) return;
  state.timer.active = true;
  state.timer.startedAt = Date.now();
  saveState();
  updateTimerUI();
  timerTick = setInterval(updateTimerUI, 1000);
  toast("Timer started");
}

function stopTimer() {
  if (!state.timer.active) return;

  const elapsed = state.timer.elapsedMs + (Date.now() - state.timer.startedAt);
  state.timeEntries.unshift({
    id: Date.now(),
    projectId: state.timer.projectId,
    taskId: state.timer.taskId,
    date: new Date().toISOString().slice(0, 10),
    duration: Math.round((elapsed / 3600000) * 10) / 10
  });

  state.timer.active = false;
  state.timer.startedAt = null;
  state.timer.elapsedMs = 0;

  clearInterval(timerTick);
  timerTick = null;

  saveState();
  buildLookups();
  renderStats();
  renderProjects();
  updateTimerUI();
  toast("Time logged");
}

function setTimerProject(projectId) {
  state.timer.projectId = Number(projectId);
  const project = projectLookup.get(state.timer.projectId);
  state.timer.taskId = project?.tasks[0]?.id || null;
  saveState();
  renderTimerFields();
  updateTimerUI();
}

function setTimerTask(taskId) {
  state.timer.taskId = Number(taskId);
  saveState();
  updateTimerUI();
}

function drawRevenueChart() {
  const canvas = els.revenueChart;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const labels = ["Feb", "Mar", "Apr", "May"];
  const values = [450, 720, 580, 900];
  const pad = 26;
  const width = rect.width - pad * 2;
  const height = rect.height - pad * 2;
  const max = Math.max(...values, 1);

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = pad + (height / 3) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(pad + width, y);
    ctx.stroke();
  }

  const points = values.map((value, index) => ({
    x: pad + (index / (values.length - 1)) * width,
    y: pad + height - (value / max) * height
  }));

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.strokeStyle = "#2251d1";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  const gradient = ctx.createLinearGradient(0, pad, 0, pad + height);
  gradient.addColorStop(0, "rgba(34, 81, 209, 0.16)");
  gradient.addColorStop(1, "rgba(34, 81, 209, 0)");
  ctx.lineTo(points.at(-1).x, pad + height);
  ctx.lineTo(points[0].x, pad + height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.fillStyle = "#2251d1";
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#6b7280";
  ctx.font = "12px Instrument Sans, sans-serif";
  labels.forEach((label, index) => {
    ctx.fillText(label, points[index].x - 10, rect.height - 8);
  });
}

function openModal(kind) {
  const configs = {
    project: {
      eyebrow: "New Project",
      title: "Create project",
      fields: `
        <div class="form-grid">
          <label>Project name<input name="name" required placeholder="Website refresh" /></label>
          <label>Client
            <select name="clientId">${state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)} - ${escapeHtml(client.company)}</option>`).join("")}</select>
          </label>
        </div>
        <div class="form-grid">
          <label>Deadline<input name="deadline" type="date" required /></label>
          <label>Budget<input name="budget" type="number" min="0" step="50" required placeholder="1000" /></label>
        </div>
        <label>Status
          <select name="status">
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </label>
      `
    },
    task: {
      eyebrow: "New Task",
      title: "Add task",
      fields: `
        <div class="form-grid">
          <label>Project
            <select name="projectId">${state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("")}</select>
          </label>
          <label>Task title<input name="title" required placeholder="Review layout" /></label>
        </div>
        <div class="form-grid">
          <label>Deadline<input name="deadline" type="date" required /></label>
          <label>Estimate<input name="estimate" type="number" min="1" step="1" required placeholder="3" /></label>
        </div>
        <label>Status
          <select name="status">
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </label>
      `
    },
    client: {
      eyebrow: "New Client",
      title: "Add client",
      fields: `
        <div class="form-grid">
          <label>Name<input name="name" required placeholder="Client name" /></label>
          <label>Company<input name="company" required placeholder="Company" /></label>
        </div>
        <div class="form-grid">
          <label>Email<input name="email" type="email" required placeholder="name@email.com" /></label>
          <label>Phone<input name="phone" placeholder="+1 000 000 0000" /></label>
        </div>
        <label>Notes<textarea name="notes" rows="3" placeholder="Short client note"></textarea></label>
      `
    },
    invoice: {
      eyebrow: "New Invoice",
      title: "Create invoice",
      fields: `
        <div class="form-grid">
          <label>Invoice ID<input name="id" required placeholder="FF-203" /></label>
          <label>Client
            <select name="clientId">${state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)} - ${escapeHtml(client.company)}</option>`).join("")}</select>
          </label>
        </div>
        <div class="form-grid">
          <label>Project
            <select name="projectId">${state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("")}</select>
          </label>
          <label>Amount<input name="amount" type="number" min="0" step="50" required placeholder="500" /></label>
        </div>
        <label>Status
          <select name="status">
            <option>Pending</option>
            <option>Paid</option>
          </select>
        </label>
      `
    }
  };

  const config = configs[kind];
  if (!config) return;

  els.modalEyebrow.textContent = config.eyebrow;
  els.modalTitle.textContent = config.title;
  els.modalForm.innerHTML = `
    ${config.fields}
    <div class="form-actions">
      <button type="button" class="ghost-btn" id="cancelModal">Cancel</button>
      <button type="submit" class="primary-btn">Save</button>
    </div>
  `;
  els.modalForm.dataset.kind = kind;
  els.modalBackdrop.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  els.modalForm.querySelector("#cancelModal").addEventListener("click", closeModal);
}

function closeModal() {
  els.modalBackdrop.classList.add("hidden");
  els.modalForm.innerHTML = "";
  document.body.style.overflow = "";
}

function handleModalSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const kind = event.currentTarget.dataset.kind;

  if (kind === "project") {
    const projectId = nextId(state.projects);
    state.projects.unshift({
      id: projectId,
      name: formData.get("name"),
      clientId: Number(formData.get("clientId")),
      deadline: formData.get("deadline"),
      budget: Number(formData.get("budget")),
      status: formData.get("status"),
      tasks: [
        { id: projectId * 100 + 1, title: "Kickoff", status: "Pending", deadline: formData.get("deadline"), estimate: 2 }
      ]
    });
    toast("Project created");
  }

  if (kind === "task") {
    const project = state.projects.find((item) => item.id === Number(formData.get("projectId")));
    if (project) {
      project.tasks.push({
        id: nextId(state.projects.flatMap((item) => item.tasks)),
        title: formData.get("title"),
        status: formData.get("status"),
        deadline: formData.get("deadline"),
        estimate: Number(formData.get("estimate"))
      });
      toast("Task added");
    }
  }

  if (kind === "client") {
    state.clients.unshift({
      id: nextId(state.clients),
      name: formData.get("name"),
      company: formData.get("company"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      lastContact: new Date().toISOString().slice(0, 10),
      notes: formData.get("notes") || "New client"
    });
    toast("Client added");
  }

  if (kind === "invoice") {
    state.invoices.unshift({
      id: formData.get("id"),
      clientId: Number(formData.get("clientId")),
      projectId: Number(formData.get("projectId")),
      amount: Number(formData.get("amount")),
      status: formData.get("status")
    });
    toast("Invoice created");
  }

  buildLookups();
  saveState();
  renderAll();
  closeModal();
}

function attachEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.searchQuery = event.target.value;
    renderProjects();
    renderClients();
    renderInvoices();
    saveState();
  });

  els.invoiceFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.invoiceFilter = button.dataset.filter;
    [...els.invoiceFilter.querySelectorAll(".pill")].forEach((pill) => pill.classList.remove("active"));
    button.classList.add("active");
    renderInvoices();
    saveState();
  });

  document.querySelectorAll("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", () => openModal(button.dataset.openModal));
  });

  els.closeModal.addEventListener("click", closeModal);
  els.modalBackdrop.addEventListener("click", (event) => {
    if (event.target === els.modalBackdrop) closeModal();
  });
  els.modalForm.addEventListener("submit", handleModalSubmit);

  els.timerStart.addEventListener("click", startTimer);
  els.timerStop.addEventListener("click", stopTimer);
  els.timerProject.addEventListener("change", (event) => setTimerProject(event.target.value));
  els.timerTask.addEventListener("change", (event) => setTimerTask(event.target.value));

  window.addEventListener("resize", drawRevenueChart);
}

function renderAll() {
  renderStats();
  renderProjects();
  renderClients();
  renderInvoices();
  renderTimerFields();
  updateTimerUI();
  drawRevenueChart();
}

function init() {
  els.incomeStat = $("incomeStat");
  els.invoiceStat = $("invoiceStat");
  els.hoursStat = $("hoursStat");
  els.planMeter = $("planMeter");
  els.projectList = $("projectList");
  els.clientGrid = $("clientGrid");
  els.invoiceTable = $("invoiceTable");
  els.searchInput = $("searchInput");
  els.invoiceFilter = $("invoiceFilter");
  els.timerDisplay = $("timerDisplay");
  els.timerState = $("timerState");
  els.timerCaption = $("timerCaption");
  els.timerProject = $("timerProject");
  els.timerTask = $("timerTask");
  els.timerStart = $("timerStart");
  els.timerStop = $("timerStop");
  els.revenueChart = $("revenueChart");
  els.modalBackdrop = $("modalBackdrop");
  els.modalForm = $("modalForm");
  els.modalTitle = $("modalTitle");
  els.modalEyebrow = $("modalEyebrow");
  els.closeModal = $("closeModal");
  els.toastStack = $("toastStack");

  loadState();
  buildLookups();
  attachEvents();
  renderAll();

  if (state.timer.active && state.timer.startedAt) {
    timerTick = setInterval(updateTimerUI, 1000);
  }
}

document.addEventListener("DOMContentLoaded", init);
