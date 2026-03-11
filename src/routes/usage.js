const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifyToken = require("../middleware/verifyToken");
const { upsertPatientCompliance, compute30DayHours } = require("../services/complianceService");

// ================= GET usage logs for patient =================
router.get("/:patientId", verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    const logs = await pool.query(
      `
      SELECT id, usage_date, hours_used, source, created_at
      FROM usage_logs
      WHERE patient_id = $1
      ORDER BY usage_date DESC
      LIMIT 120
      `,
      [patientId]
    );

    const summary = await compute30DayHours(patientId);

    res.json({
      patientId: Number(patientId),
      summary,
      logs: logs.rows,
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    res.status(500).json({ error: "Server error fetching usage" });
  }
});

// ================= ADD a usage log (manual entry) =================
router.post("/:patientId", verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { usage_date, hours_used, source } = req.body;

    if (!usage_date || hours_used === undefined) {
      return res.status(400).json({ error: "usage_date and hours_used are required" });
    }

    const inserted = await pool.query(
      `
      INSERT INTO usage_logs (patient_id, usage_date, hours_used, source)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [patientId, usage_date, Number(hours_used), source || "manual"]
    );

    // μετά από κάθε εισαγωγή, ενημερώνουμε compliance + alerts
    const compliance = await upsertPatientCompliance(patientId);

    res.status(201).json({
      log: inserted.rows[0],
      compliance,
    });
  } catch (error) {
    console.error("Error creating usage log:", error);
    res.status(500).json({ error: "Server error creating usage log" });
  }
});

// ================= Recompute compliance (force) =================
router.post("/:patientId/recompute", verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const compliance = await upsertPatientCompliance(patientId);
    res.json({ patientId: Number(patientId), compliance });
  } catch (error) {
    console.error("Error recomputing compliance:", error);
    res.status(500).json({ error: "Server error recomputing compliance" });
  }
});

module.exports = router;
