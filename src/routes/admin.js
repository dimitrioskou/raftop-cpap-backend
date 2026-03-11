const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateToken, requireAdmin } = require("../middleware/authMiddleware");

// ==============================
// DASHBOARD STATS
// ==============================
router.get("/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const doctorsQ = await pool.query(
      `SELECT COUNT(*)::int AS count FROM users WHERE role = 'doctor'`
    );

    const patientsQ = await pool.query(
      `SELECT COUNT(*)::int AS count FROM patients`
    );

    const compliantQ = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM patients
      WHERE compliance_status = 'COMPLIANT'
    `);

    const devicesQ = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM patients
      WHERE device_serial IS NOT NULL AND device_serial <> ''
    `);

    const subscriptionsQ = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM doctor_subscriptions
      WHERE status = 'active'
    `);

    res.json({
      success: true,
      stats: {
        doctors: doctorsQ.rows[0].count,
        patients: patientsQ.rows[0].count,
        compliant_patients: compliantQ.rows[0].count,
        cpap_devices: devicesQ.rows[0].count,
        active_subscriptions: subscriptionsQ.rows[0].count
      }
    });
  } catch (error) {
    console.error("ADMIN STATS ERROR:", error);
    res.status(500).json({ error: "Failed to load admin stats" });
  }
});

// ==============================
// CREATE DOCTOR
// ==============================
router.post("/create-doctor", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, name, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "username και password απαιτούνται"
      });
    }

    const existing = await pool.query(
      `SELECT id FROM users WHERE username = $1 OR email = $2`,
      [username, email || null]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Υπάρχει ήδη ιατρός με αυτό το username ή email"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO users (username, password, role, name, email)
      VALUES ($1, $2, 'doctor', $3, $4)
      RETURNING id, username, name, email, role, created_at
      `,
      [username, password, name || null, email || null]
    );

    res.json({
      success: true,
      doctor: result.rows[0]
    });
  } catch (error) {
    console.error("CREATE DOCTOR ERROR:", error);
    res.status(500).json({ error: "Doctor creation failed" });
  }
});

// ==============================
// GET ALL DOCTORS
// ==============================
router.get("/doctors", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.name,
        u.email,
        u.role,
        u.created_at,
        COUNT(p.id)::int AS patient_count
      FROM users u
      LEFT JOIN patients p
        ON p.doctor_id = u.id
      WHERE u.role = 'doctor'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      doctors: result.rows
    });
  } catch (error) {
    console.error("GET DOCTORS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

// ==============================
// GET ALL PATIENTS FOR ADMIN
// ==============================
router.get("/patients", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.age,
        p.diagnosis,
        p.phone,
        p.cpap_hours,
        p.compliance_status,
        p.device_serial,
        p.doctor_id,
        p.created_at,
        u.name AS doctor_name,
        u.username AS doctor_username
      FROM patients p
      LEFT JOIN users u
        ON p.doctor_id = u.id
      ORDER BY p.created_at DESC
    `);

    res.json({
      success: true,
      patients: result.rows
    });
  } catch (error) {
    console.error("GET ADMIN PATIENTS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
});

// ==============================
// CREATE PATIENT
// ==============================
router.post("/patients", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      age,
      diagnosis,
      phone,
      device_serial,
      doctor_id
    } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "Το όνομα ασθενούς είναι υποχρεωτικό"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO patients
      (name, age, diagnosis, phone, device_serial, doctor_id, cpap_hours, compliance_status)
      VALUES ($1, $2, $3, $4, $5, $6, 0, 'NON_COMPLIANT')
      RETURNING *
      `,
      [
        name,
        age || null,
        diagnosis || null,
        phone || null,
        device_serial || null,
        doctor_id || null
      ]
    );

    res.json({
      success: true,
      patient: result.rows[0]
    });
  } catch (error) {
    console.error("CREATE PATIENT ERROR:", error);
    res.status(500).json({ error: "Failed to create patient" });
  }
});

// ==============================
// UPDATE PATIENT
// ==============================
router.put("/patients/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const patientId = req.params.id;
    const {
      name,
      age,
      diagnosis,
      phone,
      device_serial,
      doctor_id
    } = req.body;

    const result = await pool.query(
      `
      UPDATE patients
      SET
        name = $1,
        age = $2,
        diagnosis = $3,
        phone = $4,
        device_serial = $5,
        doctor_id = $6
      WHERE id = $7
      RETURNING *
      `,
      [name, age, diagnosis, phone, device_serial, doctor_id || null, patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json({
      success: true,
      patient: result.rows[0]
    });
  } catch (error) {
    console.error("UPDATE PATIENT ERROR:", error);
    res.status(500).json({ error: "Failed to update patient" });
  }
});

// ==============================
// DELETE PATIENT
// ==============================
router.delete("/patients/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const patientId = req.params.id;

    await pool.query(`DELETE FROM patients WHERE id = $1`, [patientId]);

    res.json({
      success: true,
      message: "Patient deleted"
    });
  } catch (error) {
    console.error("DELETE PATIENT ERROR:", error);
    res.status(500).json({ error: "Failed to delete patient" });
  }
});

// ==============================
// ASSIGN PATIENT TO DOCTOR
// ==============================
router.put("/patients/:id/assign-doctor", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const patientId = req.params.id;
    const { doctor_id } = req.body;

    const result = await pool.query(
      `
      UPDATE patients
      SET doctor_id = $1
      WHERE id = $2
      RETURNING *
      `,
      [doctor_id || null, patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json({
      success: true,
      patient: result.rows[0]
    });
  } catch (error) {
    console.error("ASSIGN DOCTOR ERROR:", error);
    res.status(500).json({ error: "Failed to assign doctor" });
  }
});

// ==============================
// GET SUBSCRIPTIONS
// ==============================
router.get("/subscriptions", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ds.id,
        ds.doctor_id,
        ds.plan_name,
        ds.status,
        ds.price_monthly,
        ds.start_date,
        ds.end_date,
        ds.created_at,
        u.name AS doctor_name,
        u.username
      FROM doctor_subscriptions ds
      LEFT JOIN users u
        ON ds.doctor_id = u.id
      ORDER BY ds.id DESC
    `);

    res.json({
      success: true,
      subscriptions: result.rows
    });
  } catch (error) {
    console.error("GET SUBSCRIPTIONS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

// ==============================
// CREATE SUBSCRIPTION
// ==============================
router.post("/subscriptions", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      doctor_id,
      plan_name,
      status,
      price_monthly,
      start_date,
      end_date
    } = req.body;

    if (!doctor_id || !plan_name) {
      return res.status(400).json({
        error: "doctor_id και plan_name απαιτούνται"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO doctor_subscriptions
      (doctor_id, plan_name, status, price_monthly, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        doctor_id,
        plan_name,
        status || "active",
        price_monthly || 0,
        start_date || new Date(),
        end_date || null
      ]
    );

    res.json({
      success: true,
      subscription: result.rows[0]
    });
  } catch (error) {
    console.error("CREATE SUBSCRIPTION ERROR:", error);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

// ==============================
// GET CPAP DEVICES REGISTRY
// ==============================
router.get("/devices", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id AS patient_id,
        p.name AS patient_name,
        p.device_serial,
        p.compliance_status,
        p.cpap_hours,
        u.name AS doctor_name,
        u.username AS doctor_username
      FROM patients p
      LEFT JOIN users u
        ON p.doctor_id = u.id
      WHERE p.device_serial IS NOT NULL
        AND p.device_serial <> ''
      ORDER BY p.id DESC
    `);

    res.json({
      success: true,
      devices: result.rows
    });
  } catch (error) {
    console.error("GET DEVICES ERROR:", error);
    res.status(500).json({ error: "Failed to fetch CPAP devices" });
  }
});

module.exports = router;