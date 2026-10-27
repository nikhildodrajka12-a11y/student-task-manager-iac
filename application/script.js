const taskForm = document.getElementById("taskForm");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const priorityInput = document.getElementById("priority");
const taskList = document.getElementById("taskList");
const filterStatus = document.getElementById("filterStatus");
const formMessage = document.getElementById("formMessage");
const loading = document.getElementById("loading");
const emptyState = document.getElementById("emptyState");
const submitButton = document.getElementById("submitButton");
const cancelEdit = document.getElementById("cancelEdit");

let tasks = [];
let editingId = null;

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

function showMessage(message, type = "success") {
  formMessage.textContent = message;
  formMessage.className = `message ${type}`;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function updateStats() {
  document.getElementById("totalCount").textContent = tasks.length;
  document.getElementById("pendingCount").textContent =
    tasks.filter((task) => task.status === "Pending").length;
  document.getElementById("progressCount").textContent =
    tasks.filter((task) => task.status === "In Progress").length;
  document.getElementById("completedCount").textContent =
    tasks.filter((task) => task.status === "Completed").length;
}

function renderTasks() {
  taskList.replaceChildren();

  const filter = filterStatus.value;
  const filteredTasks =
    filter === "All"
      ? tasks
      : tasks.filter((task) => task.status === filter);

  emptyState.classList.toggle("hidden", filteredTasks.length > 0);
  emptyState.querySelector("h3").textContent =
    tasks.length === 0 ? "No tasks yet" : "No matching tasks";
  emptyState.querySelector("p").textContent =
    tasks.length === 0
      ? "Add a task above to get started."
      : "Try selecting a different status filter.";

  for (const task of filteredTasks) {
    const card = makeElement("article", "task-card");
    const top = makeElement("div", "task-card-top");
    const info = makeElement("div");
    const heading = makeElement("h3", "", task.title);
    info.append(heading);

    if (task.description) {
      info.append(makeElement("p", "", task.description));
    }

    const badges = makeElement("div", "task-meta");
    badges.append(
      makeElement("span", `pill priority-${task.priority}`, `${task.priority} Priority`),
      makeElement(
        "span",
        `pill status-${task.status.replaceAll(" ", "-")}`,
        task.status
      )
    );

    const actions = makeElement("div", "task-actions");
    const editButton = makeElement("button", "secondary", "Edit");
    editButton.type = "button";
    editButton.addEventListener("click", () => startEdit(task));

    const statusButton = makeElement(
      "button",
      "secondary",
      task.status === "Completed" ? "Reopen" : "Next Status"
    );
    statusButton.type = "button";
    statusButton.addEventListener("click", () => advanceStatus(task));

    const deleteButton = makeElement("button", "delete-button", "Delete");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteTask(task));

    actions.append(editButton, statusButton, deleteButton);
    top.append(info);
    card.append(top, badges, actions);

    if (task.createdAt) {
      const date = new Date(task.createdAt);
      if (!Number.isNaN(date.getTime())) {
        card.append(
          makeElement("p", "", `Created: ${date.toLocaleString()}`)
        );
      }
    }

    taskList.append(card);
  }

  updateStats();
}

async function loadTasks() {
  loading.classList.remove("hidden");
  emptyState.classList.add("hidden");

  try {
    const data = await api("/api/tasks");
    tasks = Array.isArray(data.tasks) ? data.tasks : [];
    renderTasks();
  } catch (error) {
    showMessage(`Could not load tasks: ${error.message}`, "error");
    emptyState.classList.remove("hidden");
    emptyState.querySelector("h3").textContent = "Unable to load tasks";
    emptyState.querySelector("p").textContent =
      "Check your deployment and KV configuration.";
  } finally {
    loading.classList.add("hidden");
  }
}

function resetForm() {
  editingId = null;
  taskForm.reset();
  priorityInput.value = "Medium";
  document.getElementById("formHeading").textContent = "Create a task";
  submitButton.textContent = "+ Add Task";
  cancelEdit.classList.add("hidden");
}

function startEdit(task) {
  editingId = task.id;
  titleInput.value = task.title;
  descriptionInput.value = task.description || "";
  priorityInput.value = task.priority || "Medium";

  document.getElementById("formHeading").textContent = "Edit task";
  submitButton.textContent = "Save Changes";
  cancelEdit.classList.remove("hidden");

  taskForm.scrollIntoView({ behavior: "smooth", block: "start" });
  titleInput.focus();
}

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  if (!title) {
    showMessage("Please enter a task title.", "error");
    return;
  }

  const payload = {
    title,
    description: descriptionInput.value.trim(),
    priority: priorityInput.value,
  };

  const isEditing = Boolean(editingId);
  const url = isEditing
    ? `/api/tasks/${encodeURIComponent(editingId)}`
    : "/api/tasks";

  submitButton.disabled = true;

  try {
    const data = await api(url, {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });

    resetForm();
    showMessage(data.message || "Task saved successfully.");
    await loadTasks();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

async function advanceStatus(task) {
  const statuses = ["Pending", "In Progress", "Completed"];
  const currentIndex = statuses.indexOf(task.status);
  const nextStatus = statuses[(currentIndex + 1) % statuses.length];

  try {
    await api(`/api/tasks/${encodeURIComponent(task.id)}`, {
      method: "PUT",
      body: JSON.stringify({ status: nextStatus }),
    });

    showMessage(`Task marked as ${nextStatus}.`);
    await loadTasks();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function deleteTask(task) {
  if (!window.confirm(`Delete "${task.title}"?`)) return;

  try {
    const data = await api(`/api/tasks/${encodeURIComponent(task.id)}`, {
      method: "DELETE",
    });

    if (editingId === task.id) resetForm();

    showMessage(data.message || "Task deleted successfully.");
    await loadTasks();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

cancelEdit.addEventListener("click", () => {
  resetForm();
  showMessage("Editing cancelled.");
});

filterStatus.addEventListener("change", renderTasks);

loadTasks();