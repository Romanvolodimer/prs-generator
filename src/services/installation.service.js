import fs from "fs";
import path from "path";
import { DEFAULTS } from "../../config/defaults.js";

const DIR = path.resolve("data/installations");

/* ================= helpers ================= */

function getFilePath(id) {
  return path.join(DIR, `${id}.txt`);
}

/* ================= services ================= */

// ➕ створення установки
export function createInstallation(req, res) {
  const { mRID } = req.body;
  if (!mRID) return res.status(400).send("mRID required");

  const id = "inst_" + Date.now();

  const data = {
    installationId: id,
    mRID,
    ...DEFAULTS,
    year: new Date().getFullYear(),
    series: {},
  };

  fs.writeFileSync(getFilePath(id), JSON.stringify(data, null, 2));
  res.json(data);
}

// 📥 отримати одну установку
export function getInstallation(req, res) {
  const file = getFilePath(req.params.id);

  if (!fs.existsSync(file)) {
    return res.status(404).send("Installation not found");
  }

  res.json(JSON.parse(fs.readFileSync(file, "utf-8")));
}

// 💾 зберегти установку
export function saveInstallation(req, res) {
  const file = getFilePath(req.params.id);
  fs.writeFileSync(file, JSON.stringify(req.body, null, 2));

  res.json({ status: "ok" }); // ✅ JSON
}

// 📋 СПИСОК УСТАНОВОК  ← ОЦЕ НОВЕ
export function listInstallations(req, res) {
  if (!fs.existsSync(DIR)) return res.json([]);

  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".txt"));

  const installations = files.map((file) => {
    const data = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf-8"));
    return {
      installationId: data.installationId,
      mRID: data.mRID,
    };
  });

  res.json(installations);
}
