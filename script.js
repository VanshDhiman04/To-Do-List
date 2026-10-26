
const $ = (selector) => document.querySelector(selector);

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const prettyDate = (value) => {
  if (!value) return "No due date";

  return new Date(value + "T12:00:00").toLocaleDateString(
    undefined,
    { day: "numeric", month: "short" }
  );
};

$("#datePill").textContent = new Date().toLocaleDateString(
  undefined,
  { weekday: "short", day: "numeric", month: "short", year: "numeric" }
);

$("#dateBadge").textContent =
  "✦ " + new Date().toLocaleDateString(undefined, { weekday: "long" });

// Load saved tasks from local storage
let tasks = [];

try {
  tasks = JSON.parse(localStorage.getItem("daylight-tasks-v1") || "[]");
} catch (error) {
  tasks = [];
}

let filter = "all";

// Save tasks and refresh the interface
function save() {
  localStorage.setItem("daylight-tasks-v1", JSON.stringify(tasks));
  render();
}

// Display a small notification
function notify(message) {
  const toast = $("#toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(notify.timer);

  notify.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2100);
}

// Priority sorting order
function priorityRank(priority) {
  return {
    high: 0,
    medium: 1,
    low: 2
  }[priority] ?? 1;
}

// Render tasks and update the dashboard
function render() {
  const completed = tasks.filter(task => task.done).length;
  const remaining = tasks.length - completed;

  $("#allCount").textContent = tasks.length;

  $("#todayCount").textContent = tasks.filter(
    task => !task.done && task.due === today()
  ).length;

  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;

  $("#progressPercent").textContent = progress + "%";
  $("#progressBar").style.width = progress + "%";

  $("#progressLabel").textContent = tasks.length
    ? completed === tasks.length
      ? "All done — amazing!"
      : `${completed} of ${tasks.length} completed`
    : "Just getting started";

  $("#remainingText").textContent = remaining
    ? `${remaining} task${remaining === 1 ? "" : "s"} left to go`
    : "You're all caught up. ✨";

  const titles = {
    all: ["All tasks", "Everything you want to get done, in one place."],
    today: ["Today", "Focus on what matters today."],
    upcoming: ["Upcoming", "A look at what's coming next."],
    completed: ["Completed", "Look at everything you've achieved."]
  };

  $("#listTitle").textContent = titles[filter][0];
  $("#listSubtitle").textContent = titles[filter][1];

  // Highlight the selected navigation button
  document.querySelectorAll(".nav").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.filter === filter
    );
  });

  // Filter tasks
  let shown = tasks.filter(task => {
    if (filter === "today" && task.due !== today()) {
      return false;
    }

    if (
      filter === "upcoming" &&
      (!task.due || task.due <= today() || task.done)
    ) {
      return false;
    }

    if (filter === "completed" && !task.done) {
      return false;
    }

    return task.title
      .toLowerCase()
      .includes($("#searchInput").value.toLowerCase());
  });

  // Sort tasks
  const sort = $("#sortSelect").value;

  shown.sort((a, b) => {
    if (sort === "due") {
      return (a.due || "9999").localeCompare(b.due || "9999");
    }

    if (sort === "priority") {
      return priorityRank(a.priority) - priorityRank(b.priority);
    }

    if (sort === "alpha") {
      return a.title.localeCompare(b.title);
    }

    return a.created - b.created;
  });

  $("#taskSummary").textContent =
    `${shown.length} task${shown.length === 1 ? "" : "s"}`;

  const list = $("#taskList");
  list.innerHTML = "";

  // Empty state
  if (shown.length === 0) {
    let message = "A clear space to start fresh";
    let icon = "☀️";

    if ($("#searchInput").value) {
      message = "No matching tasks";
    } else if (filter === "completed") {
      message = "Nothing completed just yet";
      icon = "🌱";
    }

    const empty = document.createElement("div");
    empty.className = "empty";

    const emptyIcon = document.createElement("div");
    emptyIcon.className = "empty-icon";
    emptyIcon.textContent = icon;

    const heading = document.createElement("strong");
    heading.textContent = message;

    const description = document.createElement("div");
    description.style.marginTop = "7px";
    description.textContent = $("#searchInput").value
      ? "Try a different search."
      : "Add a task above and make today count.";

    empty.append(emptyIcon, heading, description);
    list.append(empty);
  }

  // Create each task element
  shown.forEach(task => {
    const row = document.createElement("div");
    row.className = "task" + (task.done ? " done" : "");

    // Complete button
    const check = document.createElement("button");
    check.className = "check";
    check.setAttribute(
      "aria-label",
      task.done ? "Mark incomplete" : "Mark complete"
    );
    check.textContent = "✓";

    check.onclick = () => {
      task.done = !task.done;
      save();

      if (task.done) {
        notify("Task completed — nice work!");
      }
    };

    // Task title and information
    const content = document.createElement("div");
    content.className = "task-content";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;

    const subtitle = document.createElement("div");
    subtitle.className = "task-sub";

    const tag = document.createElement("span");
    tag.className = "tag " + task.priority;
    tag.textContent = task.priority;

    const due = document.createElement("span");

    const overdue = task.due &&
      task.due < today() &&
      !task.done;

    due.className = "due" + (overdue ? " overdue" : "");

    due.textContent = task.due
      ? (overdue ? "Overdue · " : "Due ") + prettyDate(task.due)
      : "No due date";

    subtitle.append(tag, due);
    content.append(title, subtitle);

    // Delete button
    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "×";
    deleteButton.title = "Delete task";
    deleteButton.setAttribute(
      "aria-label",
      "Delete " + task.title
    );

    deleteButton.onclick = () => {
      tasks = tasks.filter(item => item.id !== task.id);
      save();
      notify("Task deleted");
    };

    row.append(check, content, deleteButton);
    list.append(row);
  });
}

// Add a new task
$("#addForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("#taskInput").value.trim();

  if (!title) return;

  tasks.unshift({
    id: Date.now() + Math.random(),
    title: title,
    priority: $("#priority").value,
    due: $("#dueDate").value,
    done: false,
    created: Date.now()
  });

  $("#taskInput").value = "";
  $("#dueDate").value = "";

  filter = "all";

  save();
  notify("Task added to your list");
});

// Navigation filters
document.querySelectorAll(".nav").forEach(button => {
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    render();
  });
});

// Search tasks
$("#searchInput").addEventListener("input", render);

// Change sorting order
$("#sortSelect").addEventListener("change", render);

// Delete all completed tasks
$("#clearCompleted").addEventListener("click", () => {
  const previousCount = tasks.length;

  tasks = tasks.filter(task => !task.done);

  save();

  notify(
    previousCount === tasks.length
      ? "No completed tasks to clear"
      : "Completed tasks cleared"
  );
});

// Initial display
render();
