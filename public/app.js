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

const seriesContainer = document.getElementById("seriesContainer");
const saveBtn = document.getElementById("saveBtn");
const previewBtn = document.getElementById("previewBtn");

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

/* ================= INIT ================= */

yearInput.value = new Date().getFullYear();
loadInstallations();

downloadXmlBtn.onclick = () => {
  if (!currentInstallation) {
    alert("Оберіть установку");
    return;
  }

  // ⚠️ ВАЖЛИВО: тут НЕ fetch, а просто відкриття URL
  window.open(
    `/api/installations/${currentInstallation.installationId}/xml`,
    "_blank",
  );
};
/* ================= DOWNLOAD XML ================= */
