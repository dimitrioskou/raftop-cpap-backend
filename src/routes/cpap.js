const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const pool = require("../db");

// GET /api/cpap/patients
router.get("/patients", auth, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM patients ORDER BY id DESC LIMIT 200");
    res.json({ ok: true, items: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Patients fetch failed" });
  }
});

// GET /api/cpap/compliance/:patientId
router.get("/compliance/:patientId", auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const r = await pool.query(
      "SELECT * FROM compliance WHERE patient_id=$1 ORDER BY date DESC LIMIT 120",
      [patientId]
    );
    res.json({ ok: true, items: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Compliance fetch failed" });
  }
});

// GET /api/cpap/alerts/:patientId
router.get("/alerts/:patientId", auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const r = await pool.query(
      "SELECT * FROM alerts WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 200",
      [patientId]
    );
    res.json({ ok: true, items: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Alerts fetch failed" });
  }
});

module.exports = router;
