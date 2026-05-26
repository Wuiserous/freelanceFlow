const STORAGE_KEY = "freelanceflow.dashboard.v1";

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
      name: "Lumen Studio Redesign",
      clientId: 1,
      deadline: "2026-06-03",
      budget: 2400,
      status: "In Progress",
      color: "#8c9bff",
      tasks: [
        { id: 101, title: "Moodboard and wireframes", status: "Completed", deadline: "2026-05-20", estimate: 6 },
        { id: 102, title: "Homepage UI polish", status: "In Progress", deadline: "2026-05-29", estimate: 10 },
        { id: 103, title: "Responsive QA pass", status: "Pending", deadline: "2026-06-02", estimate: 4 }
      ]
    },
    {
      id: 2,
      name: "Northstar Content System",
      clientId: 2,
      deadline: "2026-06-11",
      budget: 1800,
      status: "Pending",
      color: "#4fe0c1",
      tasks: [
        { id: 201, title: "Design tokens and spacing scale", status: "Completed", deadline: "2026-05-18", estimate: 5 },
        { id: 202, title: "CMS content modeling", status: "In Progress", deadline: "2026-06-01", estimate: 8 },
        { id: 203, title: "Editorial handoff", status: "Pending", deadline: "2026-06-08", estimate: 3 }
      ]
    },
    {
      id: 3,
      name: "Atlas Social Ad Landing",
      clientId: 3,
      deadline: "2026-05-30",
      budget: 920,
      status: "Blocked",
      color: "#ffbb6b",
      tasks: [
        { id: 301, title: "Copy alignment review", status: "Completed", deadline: "2026-05-22", estimate: 2 },
        { id: 302, title: "Performance hero animation", status: "Blocked", deadline: "2026-05-27", estimate: 6 },
        { id: 303, title: "Prelaunch checklist", status: "Pending", deadline: "2026-05-29", estimate: 2 }
      ]
    }
  ],
  clients: [
    {
      id: 1,
      name: "Maya Chen",
      company: "Lumen Labs",
      email: "maya@lumenlabs.io",
      phone: "+1 (415) 555-0182",
      lastContact: "2026-05-24",
      notes: "Prefer concise async updates and Friday check-ins."
    },
    {
      id: 2,
      name: "Daniel Ortiz",
      company: "Northstar Media",
      email: "daniel@northstar.media",
      phone: "+1 (212) 555-0117",
      lastContact: "2026-05-22",
      notes: "Wants all deliverables tagged with version numbers."
    },
    {
      id: 3,
      name: "Sara Williams",
      company: "Atlas Co.",
      email: "sara@atlasco.com",
      phone: "+1 (646) 555-0133",
      lastContact: "2026-05-25",
      notes: "Requested launch-day invoice and payment reminder."
    },
    {
      id: 4,
      name: "Ari Patel",
      company: "Crescent Studio",
      email: "ari@crescent.studio",
      phone: "+1 (917) 555-0104",
      lastContact: "2026-05-21",
      notes: "Interested in a retainer for monthly updates."
    }
  ],
  invoices: [
    { id: "FF-1024", clientId: 1, projectId: 1, due: "2026-05-28", amount: 860, status: "Pending" },
    { id: "FF-1025", clientId: 2, projectId: 2, due: "2026-05-20", amount: 640, status: "Paid" },
    { id: "FF-1026", clientId: 3, projectId: 3, due: "2026-05-30", amount: 920, status: "Pending" },
    { id: "FF-1027", clientId: 4, projectId: 2, due: "2026-06-07", amount: 420, status: "Overdue" }
  ],
  timeEntries: [
    { id: 1, projectId: 1, taskId: 102, date: "2026-05-25", duration: 2.5 },
    { id: 2, projectId: 2, taskId: 202, date: "2026-05-24", duration: 3.2 },
    { id: 3, projectId: 1, taskId: 101, date: "2026-05-23", duration: 1.6 },
    { id: 4, projectId: 3, taskId: 302, date: "2026-05-25", duration: 4.1 }
  ]
};

const els = {};
let state = structuredClone(defaultState);
let timerTick = null;

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const fullDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

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
    for (const task of project.tasks) taskLookup.set(task.id, { ...task, projectId: project.id });
  }
}

function $(id) {
  return document.getElementById(id);
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
    node.style.transform = "translateY(10px)";
    setTimeout(() => node.remove(), 220);
  }, 2600);
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

function weeklyHours() {
  return state.timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
}

function monthlyIncome() {
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
    const blob = `${project.name} ${client?.name || ""} ${client?.company || ""} ${project.status}`.toLowerCase();
    return !query || blob.includes(query);
  });
}

function filteredClients() {
  const query = state.searchQuery.trim().toLowerCase();
  return state.clients.filter((client) => {
    const blob = `${client.name} ${client.company} ${client.email} ${client.notes}`.toLowerCase();
    return !query || blob.includes(query);
  });
}

function filteredInvoices() {
  const query = state.searchQuery.trim().toLowerCase();
  return state.invoices.filter((invoice) => {
    const client = clientLookup.get(invoice.clientId);
    const project = projectLookup.get(invoice.projectId);
    const blob = `${invoice.id} ${client?.name || ""} ${project?.name || ""} ${invoice.status}`.toLowerCase();
    const matchesQuery = !query || blob.includes(query);
    const matchesStatus = state.invoiceFilter === "all" || invoice.status.toLowerCase() === state.invoiceFilter;
    return matchesQuery && matchesStatus;
  });
}

function renderStats() {
  els.incomeStat.textContent = currency.format(monthlyIncome());
  els.invoiceStat.textContent = currency.format(outstandingIncome());
  els.hoursStat.textContent = `${weeklyHours().toFixed(1)}h`;
  els.clientStat.textContent = `${state.clients.length}`;
  els.planMeter.style.width = "75%";
}

function renderProjects() {
  const markup = filteredProjects().map((project) => {
    const client = clientLookup.get(project.clientId);
    const progress = projectProgress(project);
    const hours = projectHours(project.id).toFixed(1);

    return `
      <article class="project-card fade-in">
        <div class="project-top">
          <div>
            <h3 class="project-name">${escapeHtml(project.name)}</h3>
            <div class="project-meta">
              <span>${escapeHtml(client?.company || client?.name || "Unknown client")}</span>
              <span>Due ${shortDate.format(new Date(project.deadline))}</span>
            </div>
          </div>
          <span class="status-chip" data-status="${escapeHtml(project.status)}">${escapeHtml(project.status)}</span>
        </div>

        <div class="project-stats">
          <span>Budget: ${currency.format(project.budget)}</span>
          <span>${hours}h tracked</span>
        </div>

        <div class="progress" aria-label="Project progress">
          <span style="width:${progress}%; background: linear-gradient(90deg, ${project.color}, var(--accent-2));"></span>
        </div>

        <div class="task-list">
          ${project.tasks.map((task) => `
            <div class="task-row">
              <div>
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-meta">Due ${shortDate.format(new Date(task.deadline))} · ${task.estimate}h estimate</div>
              </div>
              <span class="status-chip" data-status="${escapeHtml(task.status)}">${escapeHtml(task.status)}</span>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }).join("");

  els.projectList.innerHTML = markup || `<div class="task-row">No projects match your search.</div>`;
}

function renderClients() {
  const markup = filteredClients().map((client) => `
    <article class="client-card fade-in">
      <div class="client-row">
        <div>
          <h3>${escapeHtml(client.name)}</h3>
          <div class="client-meta">
            <span>${escapeHtml(client.company)}</span>
            <span>${escapeHtml(client.email)}</span>
            <span>${escapeHtml(client.phone)}</span>
          </div>
        </div>
        <span class="badge">Active</span>
      </div>
      <div class="client-meta">
        <span>Last contact: ${fullDate.format(new Date(client.lastContact))}</span>
        <span>${escapeHtml(client.notes)}</span>
      </div>
    </article>
  `).join("");

  els.clientGrid.innerHTML = markup || `<div class="task-row">No clients match your search.</div>`;
}

function renderInvoices() {
  const markup = filteredInvoices().map((invoice) => {
    const client = clientLookup.get(invoice.clientId);
    const project = projectLookup.get(invoice.projectId);
    return `
      <tr>
        <td>${escapeHtml(invoice.id)}</td>
        <td>${escapeHtml(client?.name || "Unknown")}<br><span class="task-meta">${escapeHtml(project?.name || "Project")}</span></td>
        <td>${shortDate.format(new Date(invoice.due))}</td>
        <td>${currency.format(invoice.amount)}</td>
        <td><span class="status-chip" data-status="${escapeHtml(invoice.status)}">${escapeHtml(invoice.status)}</span></td>
      </tr>
    `;
  }).join("");

  els.invoiceTable.innerHTML = markup || `<tr><td colspan="5">No invoices match your filter.</td></tr>`;
}

function renderTimerFields() {
  els.timerProject.innerHTML = state.projects.length
    ? state.projects.map((project) => `
      <option value="${project.id}">${escapeHtml(project.name)}</option>
    `).join("")
    : `<option value="">No projects</option>`;

  const currentProject = state.projects.find((project) => project.id === state.timer.projectId) || state.projects[0];
  els.timerProject.value = String(currentProject?.id || "");
  els.timerTask.innerHTML = currentProject?.tasks?.length
    ? currentProject.tasks.map((task) => `
      <option value="${task.id}">${escapeHtml(task.title)}</option>
    `).join("")
    : `<option value="">No tasks</option>`;
  els.timerTask.value = String(state.timer.taskId || currentProject?.tasks?.[0]?.id || "");
}

function updateTimerUI() {
  const elapsed = state.timer.active && state.timer.startedAt
    ? state.timer.elapsedMs + (Date.now() - state.timer.startedAt)
    : state.timer.elapsedMs;

  els.timerDisplay.textContent = formatDuration(elapsed);
  els.timerState.textContent = state.timer.active ? "Tracking" : "Idle";

  const project = projectLookup.get(state.timer.projectId);
  const task = taskLookup.get(state.timer.taskId);
  els.timerCaption.textContent = project && task
    ? `${project.name} · ${task.title}`
    : "Select a project and task, then start tracking.";

  if (state.timer.active) {
    els.timerStart.textContent = "Tracking...";
    els.timerStop.disabled = false;
  } else {
    els.timerStart.textContent = "Start Timer";
    els.timerStop.disabled = false;
  }
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
  const project = projectLookup.get(state.timer.projectId);
  const task = taskLookup.get(state.timer.taskId);

  state.timeEntries.unshift({
    id: Date.now(),
    projectId: state.timer.projectId,
    taskId: state.timer.taskId,
    date: new Date().toISOString().slice(0, 10),
    duration: Math.round((elapsed / 3600000) * 10) / 10
  });

  state.timer = {
    ...state.timer,
    active: false,
    startedAt: null,
    elapsedMs: 0
  };

  saveState();
  buildLookups();
  clearInterval(timerTick);
  timerTick = null;
  updateTimerUI();
  renderStats();
  renderProjects();
  drawCharts();
  toast(`Logged time for ${task?.title || "selected task"} in ${project?.name || "project"}`);
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

function drawLineChart(canvas, values, labels, colorA, colorB) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const pad = 32;
  const width = rect.width - pad * 2;
  const height = rect.height - pad * 2;
  const max = Math.max(...values, 1);
  const min = 0;
  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1 || 1)) * width;
    const y = pad + height - ((value - min) / (max - min || 1)) * height;
    return { x, y, value };
  });

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = pad + (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(pad + width, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.strokeStyle = colorA;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.fillStyle = colorB;
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });

  const grad = ctx.createLinearGradient(0, pad, 0, pad + height);
  grad.addColorStop(0, "rgba(140, 155, 255, 0.18)");
  grad.addColorStop(1, "rgba(140, 155, 255, 0)");
  ctx.lineTo(points.at(-1).x, pad + height);
  ctx.lineTo(points[0].x, pad + height);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.fillStyle = "rgba(235,240,255,0.78)";
  ctx.font = "12px Inter, sans-serif";
  labels.forEach((label, index) => {
    const point = points[index];
    ctx.fillText(label, point.x - 18, rect.height - 10);
  });
}

function drawDonut(canvas, segments) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const cx = rect.width / 2;
  const cy = rect.height / 2 + 4;
  const radius = Math.min(rect.width, rect.height) * 0.28;
  let start = -Math.PI / 2;

  segments.forEach((segment) => {
    const angle = (segment.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.lineWidth = 24;
    ctx.strokeStyle = segment.color;
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.stroke();
    start += angle;
  });

  ctx.fillStyle = "rgba(235,240,255,0.92)";
  ctx.font = "700 18px Manrope, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Expenses", cx, cy - 4);
  ctx.fillStyle = "rgba(156, 168, 199, 1)";
  ctx.font = "12px Inter, sans-serif";
  ctx.fillText(`${currency.format(segments.reduce((sum, seg) => sum + seg.value, 0))}`, cx, cy + 18);
}

function renderChartLegend() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const values = [6200, 7100, 7600, 8450, 9300, 10400];
  els.revenueLegend.innerHTML = months.map((month, index) => `
    <span class="badge" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);">
      ${month}: ${currency.format(values[index])}
    </span>
  `).join("");
}

function drawCharts() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const revenue = [6200, 7100, 7600, 8450, 9300, 10400];
  drawLineChart(els.revenueChart, revenue, months, "#8c9bff", "#4fe0c1");

  const expenses = [
    { label: "Tools", value: 980, color: "#8c9bff" },
    { label: "Tax", value: 720, color: "#4fe0c1" },
    { label: "Subscriptions", value: 360, color: "#ffbb6b" },
    { label: "Marketing", value: 420, color: "#ff7c8a" }
  ];
  drawDonut(els.expenseChart, expenses);
}

function openModal(kind) {
  const backdrop = els.modalBackdrop;
  const form = els.modalForm;

  const configs = {
    project: {
      eyebrow: "New Project",
      title: "Create a project",
      fields: `
        <div class="form-grid">
          <label>Project name<input name="name" required placeholder="Brand refresh for Aurora" /></label>
          <label>Client
            <select name="clientId">${state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)} · ${escapeHtml(client.company)}</option>`).join("")}</select>
          </label>
        </div>
        <div class="form-grid">
          <label>Deadline<input name="deadline" type="date" required /></label>
          <label>Budget<input name="budget" type="number" min="0" step="50" required placeholder="1800" /></label>
        </div>
        <label>Status
          <select name="status">
            <option>In Progress</option>
            <option>Pending</option>
            <option>Blocked</option>
            <option>Completed</option>
          </select>
        </label>
        <label>Notes<textarea name="notes" rows="4" placeholder="Describe scope, deliverables, or integrations."></textarea></label>
      `
    },
    task: {
      eyebrow: "New Task",
      title: "Add a task",
      fields: `
        <div class="form-grid">
          <label>Project
            <select name="projectId">${state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("")}</select>
          </label>
          <label>Task title<input name="title" required placeholder="Review mobile spacing" /></label>
        </div>
        <div class="form-grid">
          <label>Deadline<input name="deadline" type="date" required /></label>
          <label>Estimate (hours)<input name="estimate" type="number" min="1" step="1" required placeholder="4" /></label>
        </div>
        <label>Status
          <select name="status">
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>Blocked</option>
          </select>
        </label>
      `
    },
    client: {
      eyebrow: "New Client",
      title: "Add a client",
      fields: `
        <div class="form-grid">
          <label>Name<input name="name" required placeholder="Jordan Lee" /></label>
          <label>Company<input name="company" required placeholder="Northwind Studio" /></label>
        </div>
        <div class="form-grid">
          <label>Email<input name="email" type="email" required placeholder="jordan@northwind.com" /></label>
          <label>Phone<input name="phone" placeholder="+1 (555) 000-0000" /></label>
        </div>
        <label>Communication notes<textarea name="notes" rows="4" placeholder="Preferred meeting time, tone, follow-ups, and invoicing details."></textarea></label>
      `
    },
    invoice: {
      eyebrow: "New Invoice",
      title: "Create an invoice",
      fields: `
        <div class="form-grid">
          <label>Invoice ID<input name="id" required placeholder="FF-1030" /></label>
          <label>Client
            <select name="clientId">${state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)} · ${escapeHtml(client.company)}</option>`).join("")}</select>
          </label>
        </div>
        <div class="form-grid">
          <label>Project
            <select name="projectId">${state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("")}</select>
          </label>
          <label>Amount<input name="amount" type="number" min="0" step="25" required placeholder="1200" /></label>
        </div>
        <div class="form-grid">
          <label>Due date<input name="due" type="date" required /></label>
          <label>Status
            <select name="status">
              <option>Pending</option>
              <option>Paid</option>
              <option>Overdue</option>
            </select>
          </label>
        </div>
      `
    }
  };

  const config = configs[kind];
  if (!config) return;

  els.modalEyebrow.textContent = config.eyebrow;
  els.modalTitle.textContent = config.title;
  form.innerHTML = `
    ${config.fields}
    <div class="form-actions">
      <button type="button" class="ghost-btn" id="cancelModal">Cancel</button>
      <button type="submit" class="primary-btn">Save</button>
    </div>
  `;
  form.dataset.kind = kind;
  backdrop.classList.remove("hidden");
  backdrop.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  form.querySelector("input, select, textarea")?.focus();

  form.querySelector("#cancelModal").addEventListener("click", closeModal);
}

function closeModal() {
  els.modalBackdrop.classList.add("hidden");
  els.modalBackdrop.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  els.modalForm.innerHTML = "";
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
      color: "#8c9bff",
      tasks: [
        { id: projectId * 100 + 1, title: "Kickoff and scope review", status: "Pending", deadline: formData.get("deadline"), estimate: 2 }
      ]
    });
    toast("Project created");
  }

  if (kind === "task") {
    const project = state.projects.find((item) => item.id === Number(formData.get("projectId")));
    if (!project) return;
    const taskId = nextId(state.projects.flatMap((item) => item.tasks));
    project.tasks.push({
      id: taskId,
      title: formData.get("title"),
      status: formData.get("status"),
      deadline: formData.get("deadline"),
      estimate: Number(formData.get("estimate"))
    });
    toast("Task added");
  }

  if (kind === "client") {
    const clientId = nextId(state.clients);
    state.clients.unshift({
      id: clientId,
      name: formData.get("name"),
      company: formData.get("company"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      lastContact: new Date().toISOString().slice(0, 10),
      notes: formData.get("notes") || "New client added."
    });
    toast("Client saved");
  }

  if (kind === "invoice") {
    state.invoices.unshift({
      id: formData.get("id"),
      clientId: Number(formData.get("clientId")),
      projectId: Number(formData.get("projectId")),
      amount: Number(formData.get("amount")),
      due: formData.get("due"),
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
    renderAll();
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

  window.addEventListener("resize", () => drawCharts());
}

function renderAll() {
  renderStats();
  renderTimerFields();
  renderProjects();
  renderClients();
  renderInvoices();
  renderChartLegend();
  updateTimerUI();
  drawCharts();
}

function init() {
  els.incomeStat = $("incomeStat");
  els.invoiceStat = $("invoiceStat");
  els.hoursStat = $("hoursStat");
  els.clientStat = $("clientStat");
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
  els.expenseChart = $("expenseChart");
  els.revenueLegend = $("revenueLegend");
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
