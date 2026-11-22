const installationSelect = document.getElementById("installationSelect");
const addInstallationBtn = document.getElementById("addInstallationBtn");
const formContainer = document.getElementById("formContainer");
const currentMRID = document.getElementById("currentMRID");

const downloadXmlBtn = document.getElementById("downloadXmlBtn");
const documentDateInput = document.getElementById("documentDate");

const revisionNumberInput = document.getElementById("revisionNumber");
const processTypeInput = document.getElementById("processType");
const codingSchemeInput = document.getElementById("codingScheme");
const yearInput = document.getElementById("year");
const documentTypeInput = document.getElementById("documentType");
const senderRoleInput = document.getElementById("senderRole");
const receiverMRIDInput = document.getElementById("receiverMRID");
const receiverCodingSchemeInput = document.getElementById(
  "receiverCodingScheme",
);
const receiverRoleInput = document.getElementById("receiverRole");

const seriesContainer = document.getElementById("seriesContainer");
const saveBtn = document.getElementById("saveBtn");
const previewBtn = document.getElementById("previewBtn");

const deleteBtn = document.getElementById("deleteBtn");
const importXmlFile = document.getElementById("importXmlFile");

let installationsCache = [];

const BUSINESS_TYPES = {
  A01: "Плановий відпуск",
  A04: "Споживання",
  A60: "Тех мін",
  A61: "Тех макс",
  A96: "АРВЧ",
};

let currentInstallation = null;

/* ================= API ================= */

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

/* ================= INSTALLATIONS ================= */

async function loadInstallations() {
  installationSelect.innerHTML =
    '<option value="">— Оберіть установку —</option>';

  const installations = await api("/api/installations");
  installationsCache = installations;
  installations.forEach((inst) => {
    const option = document.createElement("option");
    option.value = inst.installationId;
    option.textContent = inst.name;
    installationSelect.appendChild(option);
  });
}

addInstallationBtn.onclick = async () => {
  const name = prompt("Введіть назву установки:");
  if (!name) return;

  const mRID = prompt("Введіть mRID установки:");
  if (!mRID) return;

  const registeredResource = prompt("Введіть registeredResource.mRID:");
  if (!registeredResource) return;

  const inst = await api("/api/installations", {
    method: "POST",
    body: JSON.stringify({
      name,
      mRID,
      registeredResource,
    }),
  });

  await loadInstallations();
  installationSelect.value = inst.installationId;
  await loadInstallation(inst.installationId);
};

installationSelect.onchange = async () => {
  if (!installationSelect.value) {
    formContainer.classList.add("hidden");
    return;
  }
  await loadInstallation(installationSelect.value);
};

async function loadInstallation(id) {
  currentInstallation = await api(`/api/installations/${id}`);

  if (!currentInstallation.documentDate) {
    // сьогоднішня дата за замовчуванням
    documentDateInput.value = new Date().toISOString().split("T")[0];
  } else {
    documentDateInput.value = currentInstallation.documentDate;
  }

  currentMRID.textContent = currentInstallation.mRID;
  revisionNumberInput.value = currentInstallation.revisionNumber;
  processTypeInput.value = currentInstallation.processType;
  codingSchemeInput.value = currentInstallation.codingScheme;
  yearInput.value = currentInstallation.year;
  documentTypeInput.value = currentInstallation.documentType || "A14";
  senderRoleInput.value = currentInstallation.senderRole || "A27";
  receiverMRIDInput.value =
    currentInstallation.receiverMRID || "10X1001C--00001X";
  receiverCodingSchemeInput.value =
    currentInstallation.receiverCodingScheme || "A01";
  receiverRoleInput.value = currentInstallation.receiverRole || "A04";

  renderSeries(currentInstallation.series || {});
  formContainer.classList.remove("hidden");
}

/* ================= SERIES ================= */

function renderSeries(seriesData) {
  seriesContainer.innerHTML = "";

  Object.entries(BUSINESS_TYPES).forEach(([code, label]) => {
    const series = seriesData[code] || { enabled: false, hours: [] };

    const box = document.createElement("div");
    box.className = "box";

    box.innerHTML = `
      <label>
        <input type="checkbox" data-code="${code}" ${
          series.enabled ? "checked" : ""
        }>
        ${code} – ${label}
      </label>

      <div class="hours hidden" id="hours-${code}">
        ${Array.from(
          { length: 24 },
          (_, i) => `
            <div class="hour">
              <span class="hour-label">${i + 1}</span>
              <input
                type="number"
                step="0.01"
                value="${series.hours[i] ?? ""}"
              >
            </div>
          `,
        ).join("")}
      </div>
    `;

    const checkbox = box.querySelector("input[type=checkbox]");
    const hoursDiv = box.querySelector(".hours");

    if (series.enabled) hoursDiv.classList.remove("hidden");

    checkbox.onchange = () => {
      hoursDiv.classList.toggle("hidden", !checkbox.checked);
    };

    seriesContainer.appendChild(box);
  });
}

/* ================= SAVE / PREVIEW ================= */

function collectData() {
  const data = {
    ...currentInstallation,

    documentDate: documentDateInput.value, // ← ВАЖЛИВО

    revisionNumber: Number(revisionNumberInput.value),
    processType: processTypeInput.value,
    codingScheme: codingSchemeInput.value,
    year: Number(yearInput.value),
    documentType: documentTypeInput.value,
    senderRole: senderRoleInput.value,
    receiverMRID: receiverMRIDInput.value,
    receiverCodingScheme: receiverCodingSchemeInput.value,
    receiverRole: receiverRoleInput.value,
    series: {},
  };

  document.querySelectorAll("#seriesContainer .box").forEach((box) => {
    const checkbox = box.querySelector("input[type=checkbox]");
    const code = checkbox.dataset.code;

    if (!checkbox.checked) return;

    const hours = [...box.querySelectorAll(".hours input")].map((i) =>
      Number(i.value || 0),
    );

    data.series[code] = {
      enabled: true,
      hours,
    };
  });

  return data;
}

saveBtn.onclick = async () => {
  if (!currentInstallation) return;

  const data = collectData();
  await api(`/api/installations/${data.installationId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  alert("✅ Дані збережено");
};

previewBtn.onclick = () => {
  console.log(collectData());
  alert("JSON виведено в console.log()");
};

/* ================= XML IMPORT ================= */

if (importXmlFile) {
  importXmlFile.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (!file.name.toLowerCase().endsWith(".xml")) {
        throw new Error("Оберіть XML-файл.");
      }

      const xmlText = await file.text();
      const imported = window.PRSXmlParser.parse(xmlText);

      if (!imported.documentDate) {
        throw new Error("У XML не вдалося визначити дату графіка.");
      }
      if (!imported.mRID) {
        throw new Error("У XML відсутній mRID відправника.");
      }

      // Визначаємо установку за mRID відправника.
      const matched = installationsCache.find(
        (item) => String(item.mRID).trim() === String(imported.mRID).trim(),
      );

      if (!matched) {
        throw new Error(
          `Установку з mRID "${imported.mRID}" не знайдено. Спочатку додайте її або перевірте mRID у налаштуваннях установок.`,
        );
      }

      installationSelect.value = String(matched.installationId);
      await loadInstallation(matched.installationId);

      // Переносимо параметри саме з імпортованого документа.
      documentDateInput.value = imported.documentDate;
      revisionNumberInput.value = imported.revisionNumber;
      processTypeInput.value = imported.processType;
      codingSchemeInput.value = imported.senderCodingScheme || "A01";
      yearInput.value = Number(imported.documentDate.slice(0, 4));
      documentTypeInput.value = imported.documentType || "A14";
      senderRoleInput.value = imported.senderRole || "A27";
      receiverMRIDInput.value = imported.receiverMRID || "10X1001C--00001X";
      receiverCodingSchemeInput.value = imported.receiverCodingScheme || "A01";
      receiverRoleInput.value = imported.receiverRole || "A04";

      // Не губимо бізнес-типи, навіть якщо їх ще немає у стандартному переліку.
      const importedSeries = { ...imported.series };
      Object.keys(importedSeries).forEach((code) => {
        if (!Object.prototype.hasOwnProperty.call(BUSINESS_TYPES, code)) {
          BUSINESS_TYPES[code] = "Імпортований бізнес-тип";
        }
      });

      renderSeries(importedSeries);

      alert(
        `XML успішно завантажено для редагування.\n` +
          `Установка: ${matched.name}\n` +
          `Дата: ${imported.documentDate}\n` +
          `Revision: ${imported.revisionNumber}\n` +
          `Бізнес-типів: ${imported.seriesCount}\n\n` +
          `revisionNumber залишено без змін.`,
      );
    } catch (error) {
      console.error("PRS XML IMPORT ERROR:", error);
      alert(error.message || "Не вдалося імпортувати XML.");
    } finally {
      // Дозволяє повторно вибрати той самий файл.
      importXmlFile.value = "";
    }
  });
}

/* ================= INIT ================= */

yearInput.value = new Date().getFullYear();
loadInstallations();

downloadXmlBtn.onclick = async () => {
  if (!currentInstallation) {
    alert("Оберіть установку");
    return;
  }

  try {
    const data = collectData();
    const response = await fetch(
      `/api/installations/${currentInstallation.installationId}/xml`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) throw new Error(await response.text());

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] || "PRS.xml";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("XML DOWNLOAD ERROR:", error);
    alert(error.message || "Не вдалося згенерувати XML.");
  }
};
/* ================= DOWNLOAD XML ================= */

deleteBtn.onclick = async () => {
  if (!currentInstallation) return;

  const ok = confirm(
    `Видалити установку "${currentInstallation.name}"? Це неможливо скасувати.`,
  );

  if (!ok) return;

  await fetch(`/api/installations/${currentInstallation.installationId}`, {
    method: "DELETE",
  });

  alert("Установку видалено");

  location.reload(); // простий варіант
};
/* ================= DOWNLOAD XML ================= */
