const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const pool = require("../db");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const crypto = require("crypto");
const { upsertPatientCompliance } = require("../services/complianceService");

// memory upload (no file saved to disk)
const upload = multer({ storage: multer.memoryStorage() });

// Helper: try match patient by serial first, then by name
async function findPatientId({ deviceSerial, patientName }) {
  if (deviceSerial) {
    const r1 = await pool.query(
      `SELECT id FROM patients WHERE device_serial = $1 LIMIT 1`,
      [deviceSerial]
    );
    if (r1.rows.length) return r1.rows[0].id;
  }

  if (patientName) {
    const r2 = await pool.query(
      `SELECT id FROM patients WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [patientName]
    );
    if (r2.rows.length) return r2.rows[0].id;
  }

  return null;
}

// Expect CSV columns like: date, patient_name, device_serial, hours_used
router.post(
  "/upload",
  verifyToken,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const batchId = crypto.randomBytes(12).toString("hex");

      const csvText = req.file.buffer.toString("utf-8");

      // parse CSV into objects with headers
      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      let inserted = 0;
      let updated = 0;
      let failed = 0;

      const failures = [];

      // Wrap in transaction for performance
      await pool.query("BEGIN");

      for (let i = 0; i < records.length; i++) {
        const row = records[i];

        // Flexible column names
        const date =
          row.date || row.Date || row.DATE || row["Usage Date"] || row["usage_date"];
        const patientName =
          row.patient_name || row.Patient || row["Patient Name"] || row.name || row.Name;
        const deviceSerial =
          row.device_serial || row.Serial || row["Device Serial"] || row.serial;
        const hoursRaw =
          row.hours_used || row.Hours || row["Usage Hours"] || row["hours"] || row["Usage"];

        const hoursUsed = Number(String(hoursRaw || "").replace(",", "."));

        if (!date || !hoursRaw || Number.isNaN(hoursUsed)) {
          failed++;
          failures.push({
            row: i + 1,
            reason: "Missing/invalid date or hours_used",
            raw: row,
          });
          continue;
        }

        const patientId = await findPatientId({
          deviceSerial: deviceSerial ? String(deviceSerial).trim() : null,
          patientName: patientName ? String(patientName).trim() : null,
        });

        if (!patientId) {
          failed++;
          failures.push({
            row: i + 1,
            reason: "Patient not found (by serial or name)",
            patientName,
            deviceSerial,
          });
          continue;
        }

        // Upsert by (patient_id + usage_date + source=resmed_csv)
        const source = "resmed_csv";

        const existing = await pool.query(
          `
          SELECT id FROM usage_logs
          WHERE patient_id = $1 AND usage_date = $2 AND source = $3
          LIMIT 1
          `,
          [patientId, date, source]
        );

        if (existing.rows.length) {
          await pool.query(
            `
            UPDATE usage_logs
            SET hours_used = $1,
                device_serial = $2,
                import_batch_id = $3
            WHERE id = $4
            `,
            [hoursUsed, deviceSerial || null, batchId, existing.rows[0].id]
          );
          updated++;
        } else {
          await pool.query(
            `
            INSERT INTO usage_logs (patient_id, usage_date, hours_used, source, device_serial, import_batch_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [patientId, date, hoursUsed, source, deviceSerial || null, batchId]
          );
          inserted++;
        }
      }

      await pool.query("COMMIT");

      // After import: recompute compliance for affected patients
      // (simple approach: recompute all patients with logs from this batch)
      const affected = await pool.query(
        `
        SELECT DISTINCT patient_id
        FROM usage_logs
        WHERE import_batch_id = $1
        `,
        [batchId]
      );

      for (const r of affected.rows) {
        await upsertPatientCompliance(r.patient_id);
      }

      res.json({
        success: true,
        batchId,
        stats: { inserted, updated, failed, total: records.length },
        failures: failures.slice(0, 30), // return first 30 failures (avoid huge response)
      });
    } catch (err) {
      try {
        await pool.query("ROLLBACK");
      } catch (e) {}
      console.error("ResMed CSV import error:", err);
      res.status(500).json({ error: "CSV import failed", details: String(err.message || err) });
    }
  }
);

module.exports = router;
