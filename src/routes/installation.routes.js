import { Router } from "express";
import {
  createInstallation,
  getInstallation,
  saveInstallation,
  listInstallations,
  getInstallationById,
} from "../services/installation.service.js";

import { generateXML } from "../services/xml.service.js";

const router = Router();

/* ================= HELPERS ================= */

function safeFileName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9а-яёіїє_-]/gi, "");
}

/* ================= ROUTES ================= */

// список установок
router.get("/", listInstallations);

// створити установку
router.post("/", createInstallation);

// отримати одну
router.get("/:id", getInstallation);

// зберегти зміни
router.post("/:id", saveInstallation);

// 🔥 ЗАВАНТАЖЕННЯ XML
router.get("/:id/xml", async (req, res) => {
  const { id } = req.params;

  // 1️⃣ Отримуємо установку
  const installation = await getInstallationById(id);

  if (!installation) {
    return res.status(404).send("Installation not found");
  }

  // 2️⃣ Генеруємо XML
  const xml = generateXML(installation);

  // 3️⃣ Назва файлу
  const fileName = safeFileName(installation.name || installation.mRID);

  // 4️⃣ Заголовки
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${fileName}.xml"`,
  );

  res.send(xml);
});

export default router;
