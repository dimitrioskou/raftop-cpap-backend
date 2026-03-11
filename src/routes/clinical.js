const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateToken } = require("../middleware/authMiddleware");

// =====================================
// HELPERS
// =====================================
function getLeakLevel(avgLeak) {
  const v = Number(avgLeak || 0);

  if (v > 24) return "HIGH_LEAK";
  if (v >= 10) return "MODERATE_LEAK";
  return "NORMAL";
}

function getAhiSeverity(avgAhi) {
  const v = Number(avgAhi || 0);

  if (v > 30) return "SEVERE";
  if (v > 15) return "MODERATE";
  if (v > 5) return "MILD";
  return "CONTROLLED";
}

function getRecommendation(type) {
  switch (type) {
    case "HIGH_AHI":
      return "Ελέγξτε πίεση θεραπείας, residual events και εφαρμογή μάσκας.";
    case "HIGH_LEAK":
      return "Ελέγξτε διαρροές μάσκας, εφαρμογή και πιθανή αλλαγή interface.";
    case "LOW_USAGE":
      return "Απαιτείται άμεσο follow-up για ενίσχυση συμμόρφωσης.";
    case "THERAPY_STOP":
      return "Επικοινωνία με ασθενή άμεσα. Πιθανή διακοπή θεραπείας.";
    default:
      return "Απαιτείται κλινική επανεκτίμηση.";
  }
}

// =====================================
// MASK LEAK ALERTS
// =====================================
router.get("/mask-leak-alerts", authenticateToken, async (req, res) => {
  try {
    const isDoctor = req.user.role === "doctor";

    const params = [];
    let whereClause = "";

    if (isDoctor) {
      params.push(req.user.id);
      whereClause = `WHERE p.doctor_id = $1`;
    }

    const result = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.diagnosis,
        p.device_serial,
        COALESCE(AVG(u.leak), 0) AS avg_leak_30d
      FROM patients p
      LEFT JOIN usage_logs u
        ON p.id = u.patient_id
       AND u.usage_date >= CURRENT_DATE - INTERVAL '30 days'
      ${whereClause}
      GROUP BY p.id, p.name, p.diagnosis, p.device_serial
      ORDER BY avg_leak_30d DESC
      `,
      params
    );

    const alerts = result.rows.map((row) => ({
      ...row,
      avg_leak_30d: Number(Number(row.avg_leak_30d || 0).toFixed(2)),
      leak_level: getLeakLevel(row.avg_leak_30d)
    }));

    res.json({
      success: true,
      alerts
    });
  } catch (error) {
    console.error("MASK LEAK ALERTS ERROR:", error);
    res.status(500).json({ error: "Failed to load mask leak alerts" });
  }
});

// =====================================
// AHI SEVERITY ENGINE
// =====================================
router.get("/ahi-severity", authenticateToken, async (req, res) => {
  try {
    const isDoctor = req.user.role === "doctor";

    const params = [];
    let whereClause = "";

    if (isDoctor) {
      params.push(req.user.id);
      whereClause = `WHERE p.doctor_id = $1`;
    }

    const result = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.diagnosis,
        p.device_serial,
        COALESCE(AVG(u.ahi), 0) AS avg_ahi_30d
      FROM patients p
      LEFT JOIN usage_logs u
        ON p.id = u.patient_id
       AND u.usage_date >= CURRENT_DATE - INTERVAL '30 days'
      ${whereClause}
      GROUP BY p.id, p.name, p.diagnosis, p.device_serial
      ORDER BY avg_ahi_30d DESC
      `,
      params
    );

    const patients = result.rows.map((row) => ({
      ...row,
      avg_ahi_30d: Number(Number(row.avg_ahi_30d || 0).toFixed(2)),
      ahi_severity: getAhiSeverity(row.avg_ahi_30d)
    }));

    res.json({
      success: true,
      patients
    });
  } catch (error) {
    console.error("AHI SEVERITY ERROR:", error);
    res.status(500).json({ error: "Failed to calculate AHI severity" });
  }
});

// =====================================
// FOLLOW-UP REMINDERS
// =====================================
router.get("/followups", authenticateToken, async (req, res) => {
  try {
    const isDoctor = req.user.role === "doctor";

    const params = [];
    let whereClause = "";

    if (isDoctor) {
      params.push(req.user.id);
      whereClause = `WHERE fr.doctor_id = $1`;
    }

    const result = await pool.query(
      `
      SELECT
        fr.id,
        fr.patient_id,
        fr.doctor_id,
        fr.reminder_date,
        fr.status,
        fr.note,
        fr.created_at,
        p.name AS patient_name,
        u.name AS doctor_name
      FROM followup_reminders fr
      LEFT JOIN patients p
        ON fr.patient_id = p.id
      LEFT JOIN users u
        ON fr.doctor_id = u.id
      ${whereClause}
      ORDER BY fr.reminder_date ASC
      `,
      params
    );

    res.json({
      success: true,
      reminders: result.rows
    });
  } catch (error) {
    console.error("FOLLOWUPS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch follow-up reminders" });
  }
});

// =====================================
// CREATE FOLLOW-UP REMINDER
// =====================================
router.post("/followups", authenticateToken, async (req, res) => {
  try {
    const { patient_id, reminder_date, note } = req.body;

    if (!patient_id || !reminder_date) {
      return res.status(400).json({
        error: "patient_id και reminder_date απαιτούνται"
      });
    }

    let doctorId = req.user.id;

    if (req.user.role === "doctor") {
      const patientCheck = await pool.query(
        `SELECT id FROM patients WHERE id = $1 AND doctor_id = $2`,
        [patient_id, doctorId]
      );

      if (patientCheck.rows.length === 0) {
        return res.status(403).json({
          error: "Δεν μπορείτε να δημιουργήσετε reminder για ξένο ασθενή"
        });
      }
    } else {
      const patientCheck = await pool.query(
        `SELECT doctor_id FROM patients WHERE id = $1`,
        [patient_id]
      );

      if (patientCheck.rows.length === 0) {
        return res.status(404).json({ error: "Patient not found" });
      }

      doctorId = patientCheck.rows[0].doctor_id;
    }

    const result = await pool.query(
      `
      INSERT INTO followup_reminders
      (patient_id, doctor_id, reminder_date, status, note)
      VALUES ($1, $2, $3, 'pending', $4)
      RETURNING *
      `,
      [patient_id, doctorId, reminder_date, note || null]
    );

    res.json({
      success: true,
      reminder: result.rows[0]
    });
  } catch (error) {
    console.error("CREATE FOLLOWUP ERROR:", error);
    res.status(500).json({ error: "Failed to create reminder" });
  }
});

// =====================================
// MARK FOLLOW-UP DONE
// =====================================
router.put("/followups/:id/done", authenticateToken, async (req, res) => {
  try {
    const reminderId = req.params.id;

    let query = `
      UPDATE followup_reminders
      SET status = 'done'
      WHERE id = $1
      RETURNING *
    `;
    let params = [reminderId];

    if (req.user.role === "doctor") {
      query = `
        UPDATE followup_reminders
        SET status = 'done'
        WHERE id = $1 AND doctor_id = $2
        RETURNING *
      `;
      params = [reminderId, req.user.id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    res.json({
      success: true,
      reminder: result.rows[0]
    });
  } catch (error) {
    console.error("FOLLOWUP DONE ERROR:", error);
    res.status(500).json({ error: "Failed to update reminder" });
  }
});

// =====================================
// AUTOMATED CLINICAL ALERT ENGINE
// Rules:
// AHI > 10
// Leak > 24
// Avg usage last 7 days < 4h
// 3 consecutive days with zero usage
// =====================================
router.get("/automated-alerts", authenticateToken, async (req, res) => {
  try {
    const isDoctor = req.user.role === "doctor";

    const params = [];
    let whereClause = "";

    if (isDoctor) {
      params.push(req.user.id);
      whereClause = `WHERE p.doctor_id = $1`;
    }

    const patientsQ = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.diagnosis,
        p.device_serial,
        p.doctor_id
      FROM patients p
      ${whereClause}
      ORDER BY p.id
      `,
      params
    );

    const alerts = [];

    for (const patient of patientsQ.rows) {
      const metricsQ = await pool.query(
        `
        WITH last30 AS (
          SELECT
            usage_date,
            COALESCE(hours_used, 0) AS hours_used,
            COALESCE(ahi, 0) AS ahi,
            COALESCE(leak, 0) AS leak
          FROM usage_logs
          WHERE patient_id = $1
            AND usage_date >= CURRENT_DATE - INTERVAL '30 days'
        ),
        last7 AS (
          SELECT
            COALESCE(AVG(hours_used), 0) AS avg_hours_7d
          FROM usage_logs
          WHERE patient_id = $1
            AND usage_date >= CURRENT_DATE - INTERVAL '7 days'
        ),
        zeros AS (
          SELECT
            usage_date,
            COALESCE(hours_used, 0) AS hours_used
          FROM usage_logs
          WHERE patient_id = $1
            AND usage_date >= CURRENT_DATE - INTERVAL '7 days'
          ORDER BY usage_date DESC
          LIMIT 7
        )
        SELECT
          COALESCE((SELECT AVG(ahi) FROM last30), 0) AS avg_ahi_30d,
          COALESCE((SELECT AVG(leak) FROM last30), 0) AS avg_leak_30d,
          COALESCE((SELECT avg_hours_7d FROM last7), 0) AS avg_hours_7d
        `,
        [patient.id]
      );

      const zeroDaysQ = await pool.query(
        `
        WITH days AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '2 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS usage_date
        )
        SELECT COUNT(*)::int AS zero_days
        FROM days d
        LEFT JOIN usage_logs u
          ON u.patient_id = $1
         AND u.usage_date = d.usage_date
        WHERE COALESCE(u.hours_used, 0) = 0
        `,
        [patient.id]
      );

      const avgAhi = Number(metricsQ.rows[0].avg_ahi_30d || 0);
      const avgLeak = Number(metricsQ.rows[0].avg_leak_30d || 0);
      const avgHours7d = Number(metricsQ.rows[0].avg_hours_7d || 0);
      const zeroDays = Number(zeroDaysQ.rows[0].zero_days || 0);

      if (avgAhi > 10) {
        alerts.push({
          patient_id: patient.id,
          patient_name: patient.name,
          diagnosis: patient.diagnosis,
          alert_type: "HIGH_AHI",
          value: Number(avgAhi.toFixed(2)),
          severity: avgAhi > 20 ? "HIGH" : "MEDIUM",
          recommendation: getRecommendation("HIGH_AHI")
        });
      }

      if (avgLeak > 24) {
        alerts.push({
          patient_id: patient.id,
          patient_name: patient.name,
          diagnosis: patient.diagnosis,
          alert_type: "HIGH_LEAK",
          value: Number(avgLeak.toFixed(2)),
          severity: avgLeak > 35 ? "HIGH" : "MEDIUM",
          recommendation: getRecommendation("HIGH_LEAK")
        });
      }

      if (avgHours7d < 4) {
        alerts.push({
          patient_id: patient.id,
          patient_name: patient.name,
          diagnosis: patient.diagnosis,
          alert_type: "LOW_USAGE",
          value: Number(avgHours7d.toFixed(2)),
          severity: avgHours7d < 2 ? "HIGH" : "MEDIUM",
          recommendation: getRecommendation("LOW_USAGE")
        });
      }

      if (zeroDays >= 3) {
        alerts.push({
          patient_id: patient.id,
          patient_name: patient.name,
          diagnosis: patient.diagnosis,
          alert_type: "THERAPY_STOP",
          value: zeroDays,
          severity: "HIGH",
          recommendation: getRecommendation("THERAPY_STOP")
        });
      }
    }

    const severityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error("AUTOMATED CLINICAL ALERTS ERROR:", error);
    res.status(500).json({ error: "Failed to generate clinical alerts" });
  }
});

module.exports = router;