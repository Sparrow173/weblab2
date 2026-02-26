"use strict";

function el(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) for (const [k, v] of Object.entries(options.attrs)) node.setAttribute(k, v);
  return node;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + "_" + Math.random().toString(16).slice(2);
}

function formatDate(iso) {
  if (!iso) return "без даты";
  const parts = iso.split("-");
  if (parts.length !== 3) return "без даты";
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return "без даты";
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

function normalizeDateInput(str) {
  // Разрешаем пусто => null; иначе ожидаем YYYY-MM-DD
  const s = String(str ?? "").trim();
  if (!s) return null;

  // простая проверка формата
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  // проверка на реальную дату
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;

  return s;
}

function buildLayout() {
  // Подключаем CSS динамически, чтобы HTML был "пустой"
  const link = el("link", { attrs: { rel: "stylesheet", href: "./css/style.css" } });
  document.head.append(link);

  const header = el("header", { className: "app-header" });
  header.append(
    el("h1", { className: "app-title", text: "ToDo-лист" }),
    el("p", { className: "app-subtitle", text: "Создавай задачи, отмечай выполненные, фильтруй и сортируй." })
  );

  const main = el("main", { className: "app-main" });
  const controls = el("section", { className: "controls", attrs: { "aria-label": "Управление задачами" } });
  const listSection = el("section", { className: "list-section", attrs: { "aria-label": "Список задач" } });

  // Форма
  const form = el("form", { className: "task-form" });

  const titleLabel = el("label", { className: "field" });
  titleLabel.append(
    el("span", { className: "field__label", text: "Задача" }),
    el("input", {
      className: "field__input",
      attrs: {
        type: "text",
        name: "title",
        required: "true",
        maxlength: "80",
        placeholder: "Например: сделать математику",
      },
    })
  );

  const dateLabel = el("label", { className: "field" });
  dateLabel.append(
    el("span", { className: "field__label", text: "Дата" }),
    el("input", { className: "field__input", attrs: { type: "date", name: "dueDate" } })
  );

  const addBtn = el("button", { className: "btn btn-primary", text: "Добавить", attrs: { type: "submit" } });
  form.append(titleLabel, dateLabel, addBtn);

  // Панель поиска/фильтра/сортировки
  const panel = el("div", { className: "panel" });

  const search = el("input", {
    className: "panel__search",
    attrs: { type: "search", placeholder: "Поиск по названию..." },
  });

  const filter = el("select", { className: "panel__select", attrs: { "aria-label": "Фильтр" } });
  filter.append(new Option("Все", "all"), new Option("Выполненные", "done"), new Option("Невыполненные", "todo"));

  const sort = el("select", { className: "panel__select", attrs: { "aria-label": "Сортировка" } });
  sort.append(
    new Option("Сортировка: ручная", "manual"),
    new Option("По дате: ближайшие", "dateAsc"),
    new Option("По дате: дальние", "dateDesc")
  );

  panel.append(search, filter, sort);

  // Список
  const hint = el("p", { className: "hint", text: "Пока задач нет. Добавь первую" });
  const ul = el("ul", { className: "task-list", attrs: { role: "list" } });

  controls.append(form, panel);
  listSection.append(hint, ul);

  main.append(controls, listSection);

  document.body.append(header, main);

  return { form, ul, hint, search, filter, sort };
}

/**
 * Task:
 * {
 *  id: string,
 *  title: string,
 *  dueDate: string|null, // YYYY-MM-DD
 *  done: boolean,
 *  order: number
 * }
 */
const state = {
  tasks: [],
  query: "",
  filter: "all",
  sort: "manual",
};

const STORAGE_KEY = "todo_tasks_v1";
const ui = buildLayout();
let draggedId = null;


function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return;

    state.tasks = data.map((t, i) => ({
      id: String(t.id),
      title: String(t.title ?? ""),
      dueDate: normalizeDateInput(t.dueDate),
      done: Boolean(t.done),
      order: Number.isFinite(t.order) ? Number(t.order) : i + 1,
    }));

    // если order дублируется или пропущен, восстановим его по порядку в массиве
    state.tasks
      .sort((a, b) => a.order - b.order)
      .forEach((t, idx) => (t.order = idx + 1));
  } catch {
    // игнорируем сломанный JSON
  }
}

function buildTaskItem(task) {
  const li = el("li", {
    className: `task ${task.done ? "task--done" : ""}`,
    attrs: { "data-id": task.id, draggable: "true" },
  });

  const top = el("div", { className: "task__top" });

  const checkbox = el("input", {
    attrs: { type: "checkbox", "aria-label": "Отметить выполненной", "data-action": "toggle" },
  });
  checkbox.checked = task.done;

  const info = el("div");
  info.append(
    el("p", { className: "task__title", text: task.title }),
    el("div", { className: "task__meta", text: `Дата: ${formatDate(task.dueDate)}` })
  );

  top.append(checkbox, info);

  const actions = el("div", { className: "task__actions" });
  const editBtn = el("button", {
    className: "btn-ghost",
    text: "Редактировать",
    attrs: { type: "button", "data-action": "edit" },
  });
  const delBtn = el("button", {
    className: "btn-ghost btn-danger",
    text: "Удалить",
    attrs: { type: "button", "data-action": "delete" },
  });

  actions.append(editBtn, delBtn);
  li.append(top, actions);
  return li;
}

function getVisibleTasks() {
  let items = [...state.tasks];

  // поиск
  const q = state.query.trim().toLowerCase();
  if (q) items = items.filter((t) => t.title.toLowerCase().includes(q));

  // фильтр
  if (state.filter === "done") items = items.filter((t) => t.done);
  if (state.filter === "todo") items = items.filter((t) => !t.done);

  // сортировка
  if (state.sort === "manual") {
    items.sort((a, b) => a.order - b.order);
  } else if (state.sort === "dateAsc") {
    items.sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31"));
  } else if (state.sort === "dateDesc") {
    items.sort((a, b) => (b.dueDate || "0000-01-01").localeCompare(a.dueDate || "0000-01-01"));
  }

  return items;
}

function render() {
  ui.ul.innerHTML = "";
  ui.hint.style.display = state.tasks.length ? "none" : "block";

  const items = getVisibleTasks();
  for (const task of items) ui.ul.append(buildTaskItem(task));
}

ui.form.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = ui.form.elements.title.value.trim();
  const dueDate = normalizeDateInput(ui.form.elements.dueDate.value);

  if (!title) return;

  const maxOrder = state.tasks.reduce((mx, t) => Math.max(mx, t.order), 0);
  state.tasks.push({
    id: uid(),
    title,
    dueDate,
    done: false,
    order: maxOrder + 1,
  });

  ui.form.reset();
  save();
  render();
});

ui.search.addEventListener("input", () => {
  state.query = ui.search.value;
  render();
});
ui.filter.addEventListener("change", () => {
  state.filter = ui.filter.value;
  render();
});
ui.sort.addEventListener("change", () => {
  state.sort = ui.sort.value;
  render();
});


ui.ul.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.getAttribute("data-action");
  if (!action) return;

  const li = btn.closest("li.task");
  const id = li?.getAttribute("data-id");
  if (!id) return;

  if (action === "delete") {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    // упорядочим order заново
    state.tasks.sort((a, b) => a.order - b.order).forEach((t, i) => (t.order = i + 1));
    save();
    render();
    return;
  }

  if (action === "edit") {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;

    const newTitle = prompt("Новый текст задачи:", task.title);
    if (newTitle === null) return;
    const titleTrim = newTitle.trim();
    if (!titleTrim) return;

    const newDateRaw = prompt("Новая дата (YYYY-MM-DD) или пусто:", task.dueDate || "");
    if (newDateRaw === null) return;

    const newDate = normalizeDateInput(newDateRaw);

    task.title = titleTrim;
    task.dueDate = newDate;

    save();
    render();
  }
});


ui.ul.addEventListener("change", (e) => {
  const input = e.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (input.getAttribute("data-action") !== "toggle") return;

  const li = input.closest("li.task");
  const id = li?.getAttribute("data-id");
  if (!id) return;

  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  task.done = input.checked;
  save();
  render();
});


ui.ul.addEventListener("dragstart", (e) => {
  const li = e.target.closest("li.task");
  if (!li) return;

  draggedId = li.getAttribute("data-id");
  li.style.opacity = "0.6";
});

ui.ul.addEventListener("dragend", (e) => {
  const li = e.target.closest("li.task");
  if (li) li.style.opacity = "";
  // чистим подсветку
  ui.ul.querySelectorAll(".task--drag-over").forEach((x) => x.classList.remove("task--drag-over"));
  draggedId = null;
});

ui.ul.addEventListener("dragover", (e) => {
  e.preventDefault();

  const li = e.target.closest("li.task");
  if (!li) return;

  ui.ul.querySelectorAll(".task--drag-over").forEach((x) => x.classList.remove("task--drag-over"));
  li.classList.add("task--drag-over");
});

ui.ul.addEventListener("drop", (e) => {
  e.preventDefault();

  const targetLi = e.target.closest("li.task");
  if (!targetLi) return;

  const targetId = targetLi.getAttribute("data-id");
  if (!draggedId || !targetId || draggedId === targetId) return;

  // работаем с массивом в ручном порядке
  const manual = [...state.tasks].sort((a, b) => a.order - b.order);

  const fromIndex = manual.findIndex((t) => t.id === draggedId);
  const toIndex = manual.findIndex((t) => t.id === targetId);
  if (fromIndex < 0 || toIndex < 0) return;

  const [moved] = manual.splice(fromIndex, 1);
  manual.splice(toIndex, 0, moved);

  manual.forEach((t, i) => (t.order = i + 1));
  state.tasks = manual;

  save();
  render();
});


load();
render();
