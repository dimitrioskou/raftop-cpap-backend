const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateToken } = require("../middleware/authMiddleware");

// =====================================
// GET FULL TIMELINE ENGINE DATA
// =====================================
router.get("/:patientId", authenticateToken, async (req, res) => {
  try {
    const patientId = req.params.patientId;

    const patientQ = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.diagnosis,
        p.device_serial,
        p.cpap_hours,
        p.compliance_status,
        u.name AS doctor_name
      FROM patients p
      LEFT JOIN users u
        ON p.doctor_id = u.id
      WHERE p.id = $1
      LIMIT 1
      `,
      [patientId]
    );

    if (patientQ.rows.length === 0) {
      return res.status(404).json({
        error: "Patient not found"
      });
    }

    const usageQ = await pool.query(
      `
      WITH days AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '29 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS usage_date
      )
      SELECT
        d.usage_date,
        COALESCE(SUM(u.hours_used), 0) AS hours_used,
        COALESCE(AVG(u.ahi), 0) AS ahi,
        COALESCE(AVG(u.leak), 0) AS leak,
        COALESCE(AVG(u.pressure), 0) AS pressure
      FROM days d
      LEFT JOIN usage_logs u
        ON u.patient_id = $1
       AND u.usage_date = d.usage_date
      GROUP BY d.usage_date
      ORDER BY d.usage_date ASC
      `,
      [patientId]
    );

    const notesQ = await pool.query(
      `
      SELECT
        n.id,
        n.note,
        n.created_at,
        u.name AS doctor_name
      FROM clinical_notes n
      LEFT JOIN users u
        ON n.doctor_id = u.id
      WHERE n.patient_id = $1
      ORDER BY n.created_at DESC
      LIMIT 20
      `,
      [patientId]
    );

    const eventsQ = await pool.query(
      `
      SELECT
        id,
        event_type,
        description,
        created_at
      FROM patient_events
      WHERE patient_id = $1
      ORDER BY created_at DESC
      LIMIT 30
      `,
      [patientId]
    );

    const followupsQ = await pool.query(
      `
      SELECT
        id,
        reminder_date,
        status,
        note,
        created_at
      FROM followup_reminders
      WHERE patient_id = $1
      ORDER BY reminder_date ASC
      `,
      [patientId]
    );

    const summaryQ = await pool.query(
      `
      SELECT
        ROUND(COALESCE(AVG(hours_used), 0)::numeric, 2) AS avg_hours_30d,
        ROUND(COALESCE(AVG(ahi), 0)::numeric, 2) AS avg_ahi_30d,
        ROUND(COALESCE(AVG(leak), 0)::numeric, 2) AS avg_leak_30d,
        ROUND(COALESCE(AVG(pressure), 0)::numeric, 2) AS avg_pressure_30d,
        COUNT(*) FILTER (WHERE COALESCE(hours_used,0) >= 4)::int AS compliant_days,
        COUNT(*) FILTER (WHERE COALESCE(hours_used,0) = 0)::int AS zero_usage_days
      FROM usage_logs
      WHERE patient_id = $1
        AND usage_date >= CURRENT_DATE - INTERVAL '30 days'
      `,
      [patientId]
    );

    res.json({
      success: true,
      patient: patientQ.rows[0],
      summary: summaryQ.rows[0],
      usage: usageQ.rows,
      notes: notesQ.rows,
      events: eventsQ.rows,
      followups: followupsQ.rows
    });
  } catch (error) {
    console.error("TIMELINE ENGINE ERROR:", error);
    res.status(500).json({
      error: "Failed to load timeline engine"
    });
  }
});

// =====================================
// ADD TIMELINE EVENT
// =====================================
router.post("/event", authenticateToken, async (req, res) => {
  try {
    const { patient_id, event_type, description } = req.body;

    if (!patient_id || !event_type) {
      return res.status(400).json({
        error: "patient_id και event_type απαιτούνται"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO patient_events
      (patient_id, event_type, description)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [patient_id, event_type, description || null]
    );

    res.json({
      success: true,
      event: result.rows[0]
    });
  } catch (error) {
    console.error("ADD TIMELINE EVENT ERROR:", error);
    res.status(500).json({
      error: "Failed to add timeline event"
    });
  }
});

module.exports = router;