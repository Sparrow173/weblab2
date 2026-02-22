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

function buildLayout() {
  // Подключаем CSS динамически (HTML трогать нельзя)
  const link = el("link", {
    attrs: { rel: "stylesheet", href: "./src/style.css" },
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

buildLayout();