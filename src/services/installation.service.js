import { pool } from "../db.js";

/* ================= LIST INSTALLATIONS ================= */
/**
 * Повертає список установок (без серій)
 */
export async function listInstallations(req, res) {
  const { rows } = await pool.query(`
    SELECT
      id AS "installationId",
      name,
      mrid AS "mRID",
      registered_resource AS "registeredResource",
      revision_number AS "revisionNumber",
      process_type AS "processType",
      coding_scheme AS "codingScheme",
      document_date AS "documentDate",
      EXTRACT(YEAR FROM COALESCE(document_date, NOW()))::int AS year
    FROM prs_installations
    ORDER BY created_at DESC
  `);

  res.json(rows);
}

/* ================= CREATE INSTALLATION ================= */
/**
 * Створює нову установку
 */
export async function createInstallation(req, res) {
  const { name, mRID, registeredResource } = req.body;

  if (!name || !mRID || !registeredResource) {
    return res.status(400).json({
      error: "name, mRID, registeredResource — обовʼязкові",
    });
  }

  const { rows } = await pool.query(
    `
    INSERT INTO prs_installations
      (name, mrid, registered_resource)
    VALUES ($1, $2, $3)
    RETURNING
      id AS "installationId",
      name,
      mrid AS "mRID",
      registered_resource AS "registeredResource",
      revision_number AS "revisionNumber",
      process_type AS "processType",
      coding_scheme AS "codingScheme",
      document_date AS "documentDate"
    `,
    [name, mRID, registeredResource],
  );

  res.status(201).json(rows[0]);
}

/* ================= GET INSTALLATION ================= */
/**
 * Повертає установку + її серії
 */
export async function getInstallation(req, res) {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    const instRes = await client.query(
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
      return res.status(404).json({ error: "Installation not found" });
    }

    const installation = instRes.rows[0];

    const seriesRes = await client.query(
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

    res.json(installation);
  } finally {
    client.release();
  }
}

/* ================= SAVE INSTALLATION ================= */
/**
 * UPDATE установки + повний reset серій
 */
export async function saveInstallation(req, res) {
  const { id } = req.params;
  const data = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ UPDATE installation
    await client.query(
      `
      UPDATE prs_installations
      SET
        revision_number = $1,
        process_type = $2,
        coding_scheme = $3,
        document_date = $4,
        updated_at = NOW()
      WHERE id = $5
      `,
      [
        data.revisionNumber,
        data.processType,
        data.codingScheme,
        data.documentDate || null,
        id,
      ],
    );

    // 2️⃣ DELETE old series
    await client.query(`DELETE FROM prs_series WHERE installation_id = $1`, [
      id,
    ]);

    // 3️⃣ INSERT new series
    for (const [businessType, s] of Object.entries(data.series || {})) {
      await client.query(
        `
        INSERT INTO prs_series
          (installation_id, business_type, enabled, hours)
        VALUES ($1, $2, $3, $4)
        `,
        [id, businessType, s.enabled, JSON.stringify(s.hours)],
      );
    }

    await client.query("COMMIT");
    res.json({ status: "ok" });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
