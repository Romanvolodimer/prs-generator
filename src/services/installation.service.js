import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// === paths ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "../../data/installations");

// === helpers ===
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getFilePath(id) {
  return path.join(DATA_DIR, `${id}.json`);
}

/* ================= EXPRESS HANDLERS ================= */

export function listInstallations(req, res) {
  ensureDir();

  const files = fs.readdirSync(DATA_DIR);

  const installations = files
    .map((file) => {
      const filePath = path.join(DATA_DIR, file);
      const raw = fs.readFileSync(filePath, "utf-8").trim();

      if (!raw) {
        console.warn(`⚠️ Порожній файл: ${file}`);
        return null;
      }

      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error(`❌ Зламаний JSON у файлі: ${file}`);
        return null;
      }
    })
    .filter(Boolean);

  res.json(installations);
}

export function createInstallation(req, res) {
  ensureDir();

  const { name, mRID, registeredResource } = req.body;

  if (!name || !mRID || !registeredResource) {
    return res.status(400).json({
      error: "name, mRID і registeredResource обовʼязкові",
    });
  }

  const installationId = `inst_${Date.now()}`;

  const installation = {
    installationId,
    name,
    mRID,
    registeredResource, // 👈 НОВЕ
    revisionNumber: 1,
    processType: "A01",
    codingScheme: "A01",
    documentDate: null,
    year: new Date().getFullYear(),
    series: {},
  };

  fs.writeFileSync(
    getFilePath(installationId),
    JSON.stringify(installation, null, 2),
    "utf-8",
  );

  res.json(installation);
}

export function getInstallation(req, res) {
  const { id } = req.params;

  const filePath = getFilePath(id);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Installation not found" });
  }

  const installation = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  res.json(installation);
}

export function saveInstallation(req, res) {
  const { id } = req.params;
  const data = req.body;

  const filePath = getFilePath(id);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Installation not found" });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

  res.json({ success: true });
}

/* ================= CLEAN FUNCTIONS (IMPORTANT) ================= */

// 🔥 ОЦЯ ФУНКЦІЯ ПОТРІБНА ДЛЯ XML
export function getInstallationById(id) {
  const filePath = getFilePath(id);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
