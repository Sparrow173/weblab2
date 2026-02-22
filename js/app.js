"use strict";

function el(tag, options = {}) {
  const node = document.createElement(tag);

  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  if (options.html) node.innerHTML = options.html;

  if (options.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) node.setAttribute(k, v);
  }

  return node;
}
function formatDate(iso) {
  if (!iso) return "без даты";
  // iso: "2026-02-18"
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "без даты";
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

function buildLayout() {
  // Подключаем CSS динамически (HTML трогать нельзя)
  const link = el("link", {
    attrs: { rel: "stylesheet", href: "./css/style.css" },
  });
  document.head.append(link);

  const header = el("header", { className: "app-header" });
  const h1 = el("h1", { className: "app-title", text: "ToDo-лист" });
  const subtitle = el("p", {
    className: "app-subtitle",
    text: "Создавай задачи, отмечай выполненные, фильтруй и сортируй.",
  });
  header.append(h1, subtitle);

  const main = el("main", { className: "app-main" });

  const controlsSection = el("section", { className: "controls", attrs: { "aria-label": "Управление задачами" } });
  const listSection = el("section", { className: "list-section", attrs: { "aria-label": "Список задач" } });

  // Форма добавления
  const form = el("form", { className: "task-form" });

  const titleLabel = el("label", { className: "field" });
  titleLabel.append(
    el("span", { className: "field__label", text: "Задача" }),
    el("input", {
      className: "field__input",
      attrs: { type: "text", name: "title", placeholder: "Например: сделать домашку", required: "true", maxlength: "80" },
    })
  );

  const dateLabel = el("label", { className: "field" });
  dateLabel.append(
    el("span", { className: "field__label", text: "Дата" }),
    el("input", {
      className: "field__input",
      attrs: { type: "date", name: "dueDate" },
    })
  );

  const addBtn = el("button", { className: "btn btn-primary", text: "Добавить", attrs: { type: "submit" } });

  form.append(titleLabel, dateLabel, addBtn);

  // Панель фильтра/сортировки/поиска (пока без логики)
  const panel = el("div", { className: "panel" });

  const search = el("input", {
    className: "panel__search",
    attrs: { type: "search", placeholder: "Поиск по названию..." },
  });

  const filter = el("select", { className: "panel__select", attrs: { "aria-label": "Фильтр" } });
  filter.append(
    new Option("Все", "all"),
    new Option("Выполненные", "done"),
    new Option("Невыполненные", "todo")
  );

  const sort = el("select", { className: "panel__select", attrs: { "aria-label": "Сортировка" } });
  sort.append(
    new Option("Сортировка: по умолчанию", "manual"),
    new Option("По дате: ближайшие сверху", "dateAsc"),
    new Option("По дате: дальние сверху", "dateDesc")
  );

  panel.append(search, filter, sort);

  controlsSection.append(form, panel);

  // Список
  const ul = el("ul", { className: "task-list", attrs: { role: "list" } });
  const hint = el("p", { className: "hint", text: "Пока задач нет. Добавь первую" });

  listSection.append(hint, ul);

  main.append(controlsSection, listSection);
  document.body.append(header, main);

  return { form, ul, hint, search, filter, sort };
}

const state = {
  tasks: [],
  query: "",
  filter: "all",
  sort: "manual",
};

const ui = buildLayout();

function render() {
  // 1) Берём задачи
  let items = [...state.tasks];

  // 2) Поиск
  if (state.query.trim()) {
    const q = state.query.trim().toLowerCase();
    items = items.filter(t => t.title.toLowerCase().includes(q));
  }

  // 3) Фильтр
  if (state.filter === "done") items = items.filter(t => t.done);
  if (state.filter === "todo") items = items.filter(t => !t.done);

  // 4) Сортировка
  if (state.sort === "manual") {
    items.sort((a, b) => a.order - b.order);
  } else if (state.sort === "dateAsc") {
    items.sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31"));
  } else if (state.sort === "dateDesc") {
    items.sort((a, b) => (b.dueDate || "0000-01-01").localeCompare(a.dueDate || "0000-01-01"));
  }

  // 5) Рендер в DOM
  ui.ul.innerHTML = "";
  ui.hint.style.display = state.tasks.length ? "none" : "block";

  for (const task of items) {
    ui.ul.append(buildTaskItem(task));
  }
}

function buildTaskItem(task) {
  const li = el("li", { className: `task ${task.done ? "task--done" : ""}`, attrs: { "data-id": task.id } });

  const top = el("div", { className: "task__top" });

  const checkbox = el("input", { attrs: { type: "checkbox", "aria-label": "Отметить выполненной" } });
  checkbox.checked = task.done;

  const info = el("div");
  info.append(
    el("p", { className: "task__title", text: task.title }),
    el("div", { className: "task__meta", text: `Дата: ${formatDate(task.dueDate)}` })
  );

  top.append(checkbox, info);

  const actions = el("div", { className: "task__actions" });
  const editBtn = el("button", { className: "btn-ghost", text: "Редактировать", attrs: { type: "button" } });
  const delBtn = el("button", { className: "btn-ghost btn-danger", text: "Удалить", attrs: { type: "button" } });

  editBtn.setAttribute("data-action", "edit");
  delBtn.setAttribute("data-action", "delete");
  checkbox.setAttribute("data-action", "toggle");
  
  ui.ul.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.getAttribute("data-action");
  if (!action) return;

  const li = btn.closest("li.task");
  if (!li) return;

  const id = li.getAttribute("data-id");
  if (action === "delete") {
    state.tasks = state.tasks.filter(t => t.id !== id);
    render();
  }});

  actions.append(editBtn, delBtn);

  li.append(top, actions);
  return li;
}

// Первичный рендер
render();

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + "_" + Math.random().toString(16).slice(2);
}

ui.form.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = ui.form.elements.title.value.trim();
  const dueDate = ui.form.elements.dueDate.value || null;

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
  render();
});
