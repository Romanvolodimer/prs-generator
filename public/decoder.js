const xmlFile = document.getElementById("xmlFile");
const fileInfo = document.getElementById("fileInfo");
const dropZone = document.getElementById("dropZone");
const errorMessage = document.getElementById("errorMessage");

const resultContainer = document.getElementById("resultContainer");
const documentInfo = document.getElementById("documentInfo");
const seriesContainer = document.getElementById("seriesContainer");

const BUSINESS_TYPES = {
  A01: "Запланований відпуск",
  A04: "Заплановане споживання",
  A60: "Тех MIN",
  A61: "Тех MAX",
  A96: "аРВЧ",
};

// Перевірка наявності необхідних HTML-елементів
if (
  !xmlFile ||
  !fileInfo ||
  !dropZone ||
  !errorMessage ||
  !resultContainer ||
  !documentInfo ||
  !seriesContainer
) {
  console.error("Не знайдено необхідні HTML-елементи Decoder.");
} else {
  // Початковий стан
  resultContainer.classList.add("hidden");
  errorMessage.classList.add("hidden");

  // Вибір файлу через кнопку
  xmlFile.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (file) {
      processFile(file);
    }
  });

  // Drag and Drop
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();

      dropZone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();

      dropZone.classList.remove("drag-over");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files[0];

    if (file) {
      processFile(file);
    }
  });
}

// Обробка файлу
async function processFile(file) {
  resultContainer.classList.add("hidden");
  errorMessage.classList.add("hidden");

  documentInfo.innerHTML = "";
  seriesContainer.innerHTML = "";

  if (!file.name.toLowerCase().endsWith(".xml")) {
    showError("Оберіть XML-файл.");
    return;
  }

  fileInfo.textContent = `Файл: ${file.name}`;

  try {
    const text = await file.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");

    if (xml.getElementsByTagName("parsererror").length > 0) {
      throw new Error("Некоректний XML-файл.");
    }

    const root = xml.documentElement;

    if (root.localName !== "PlannedResourceSchedule_MarketDocument") {
      throw new Error("Невірний формат XML-документа.");
    }

    renderDocument(root);

    resultContainer.classList.remove("hidden");
  } catch (error) {
    console.error("Помилка розшифрування:", error);
    showError(error.message || "Не вдалося розшифрувати XML.");
  }
}

// Пошук дочірнього елемента
function getChild(parent, name) {
  if (!parent) return null;

  return (
    Array.from(parent.children).find((element) => element.localName === name) ||
    null
  );
}

// Отримання значення за шляхом
function getText(parent, path) {
  if (!parent) return "—";

  const parts = path.split(".");
  let current = parent;

  for (const part of parts) {
    current = getChild(current, part);

    if (!current) {
      return "—";
    }
  }

  return current.textContent.trim() || "—";
}

// Захист HTML
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

// Форматування дати
function formatDate(value) {
  if (!value || value === "—") return value;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Kyiv",
  }).format(date);
}

// Відображення інформації про документ
function renderDocument(root) {
  const interval = getChild(root, "schedule_Period");

  documentInfo.innerHTML = `
        <p><b>mRID:</b> ${escapeHtml(getText(root, "mRID"))}</p>

        <p><b>Revision:</b>
        ${escapeHtml(getText(root, "revisionNumber"))}</p>

        <p><b>Тип документа:</b>
        ${escapeHtml(getText(root, "type"))}</p>

        <p><b>Дата створення:</b>
        ${escapeHtml(formatDate(getText(root, "createdDateTime")))}</p>

        <p><b>Відправник:</b>
        ${escapeHtml(getText(root, "sender_MarketParticipant.mRID"))}</p>

        <p><b>Отримувач:</b>
        ${escapeHtml(getText(root, "receiver_MarketParticipant.mRID"))}</p>

        <p><b>Початок періоду:</b>
        ${escapeHtml(formatDate(getText(interval, "start")))}</p>

        <p><b>Кінець періоду:</b>
        ${escapeHtml(formatDate(getText(interval, "end")))}</p>
    `;

  const series = Array.from(
    root.getElementsByTagNameNS("*", "PlannedResource_TimeSeries"),
  );

  if (series.length === 0) {
    seriesContainer.textContent = "Часові ряди не знайдено.";
    return;
  }

  seriesContainer.appendChild(createTable(series));
}

// Створення загальної таблиці
function createTable(seriesList) {
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrap";

  const table = document.createElement("table");
  table.className = "decoder-main-table";

  // Заголовок таблиці
  const thead = document.createElement("thead");
  const header = document.createElement("tr");

  const firstHeader = document.createElement("th");
  firstHeader.textContent = "Business Type";

  header.appendChild(firstHeader);

  for (let hour = 1; hour <= 24; hour++) {
    const th = document.createElement("th");
    th.textContent = hour;

    header.appendChild(th);
  }

  thead.appendChild(header);
  table.appendChild(thead);

  // Дані
  const tbody = document.createElement("tbody");

  seriesList.forEach((series) => {
    tbody.appendChild(createSeriesRow(series));
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);

  return wrapper;
}

// Створення рядка часового ряду
function createSeriesRow(series) {
  const row = document.createElement("tr");

  const type = getText(series, "businessType");

  // Назва Business Type
  const firstCell = document.createElement("td");

  firstCell.innerHTML = `
        <b>${escapeHtml(type)}</b>
        ${BUSINESS_TYPES[type] ? `<br>${escapeHtml(BUSINESS_TYPES[type])}` : ""}
    `;

  row.appendChild(firstCell);

  // Отримання 15-хвилинних значень
  const period = getChild(series, "Series_Period");

  const points = period
    ? Array.from(period.getElementsByTagNameNS("*", "Point"))
    : [];

  const values = new Map();

  points.forEach((point) => {
    const position = Number(getText(point, "position"));
    const quantity = Number(getText(point, "quantity"));

    if (
      Number.isInteger(position) &&
      position >= 1 &&
      position <= 96 &&
      Number.isFinite(quantity)
    ) {
      values.set(position, quantity);
    }
  });

  // Розрахунок середнього значення за кожну годину
  for (let hour = 0; hour < 24; hour++) {
    const quarters = [];

    for (let quarter = 1; quarter <= 4; quarter++) {
      const position = hour * 4 + quarter;

      if (values.has(position)) {
        quarters.push(values.get(position));
      }
    }

    const cell = document.createElement("td");
    cell.className = "hour-value";

    if (quarters.length > 0) {
      const average =
        quarters.reduce((sum, value) => sum + value, 0) / quarters.length;

      cell.textContent = average.toFixed(1);
      cell.title = `${quarters.length} з 4 значень`;
    } else {
      cell.textContent = "—";
    }

    row.appendChild(cell);
  }

  return row;
}

// Відображення помилки
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}
