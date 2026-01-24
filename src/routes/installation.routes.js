import { Router } from "express";
import {
  listInstallations,
  createInstallation,
  getInstallation,
  saveInstallation,
} from "../services/installation.service.js";

import { generateXML } from "../services/xml.service.js";
import { pool } from "../db.js";

const router = Router();

/* ================= HELPERS ================= */

function safeFileName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9а-яёіїє_-]/gi, "");
}
function formatDateUA(dateValue) {
  if (!dateValue) return "no-date";

  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);

  if (isNaN(d.getTime())) return "no-date";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}.${month}.${year}`;
}

/* ================= ROUTES ================= */

// список установок
router.get("/", listInstallations);

// створити установку
router.post("/", createInstallation);

// отримати одну (для UI)
router.get("/:id", getInstallation);

// зберегти зміни
router.post("/:id", saveInstallation);

// 🗑️ видалити установку
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM prs_installations WHERE id = $1",
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Installation not found" });
    }

    res.json({ status: "deleted" });
  } catch (err) {
    console.error("DELETE INSTALLATION ERROR:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// 🔥 ЗАВАНТАЖЕННЯ XML
router.get("/:id/xml", async (req, res) => {
  const { id } = req.params;

  try {
    // 1️⃣ Отримуємо установку з БД
    const instRes = await pool.query(
      `
      SELECT
        id AS "installationId",
        name,
        mrid AS "mRID",
        registered_resource AS "registeredResource",
        revision_number AS "revisionNumber",
        process_type AS "processType",
        coding_scheme AS "codingScheme",
        document_date AS "documentDate"
      FROM prs_installations
      WHERE id = $1
      `,
      [id],
    );

    if (instRes.rowCount === 0) {
      return res.status(404).send("Installation not found");
    }

    const installation = instRes.rows[0];

    // 2️⃣ Отримуємо серії
    const seriesRes = await pool.query(
      `
      SELECT business_type, enabled, hours
      FROM prs_series
      WHERE installation_id = $1
      `,
      [id],
    );

    installation.series = {};
    for (const row of seriesRes.rows) {
      installation.series[row.business_type] = {
        enabled: row.enabled,
        hours: row.hours,
      };
    }

    // 3️⃣ Генеруємо XML
    const xml = generateXML(installation);

    // 4️⃣ Назва файлу
    const docDate = formatDateUA(installation.documentDate);

    const fileName = safeFileName(
      `${installation.name || installation.mRID}--V${installation.revisionNumber}-:${docDate}`,
    );

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}.xml"`,
    );

    res.send(xml);
  } catch (err) {
    console.error("XML DOWNLOAD ERROR:", err);
    res.status(500).send("XML generation failed");
  }
});

export default router;
