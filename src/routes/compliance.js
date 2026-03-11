const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const pool = require("../db");

// GET Compliance Records
router.get("/", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        patient_id,
        compliance_percentage,
        cpap_hours,
        status
      FROM compliance
      ORDER BY patient_id ASC
    `);

    // 🔥 ΣΤΕΛΝΟΥΜΕ ΠΑΝΤΑ ARRAY
    res.json(result.rows);
  } catch (err) {
    console.error("Compliance error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
