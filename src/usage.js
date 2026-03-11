const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifyToken = require("../middleware/verifyToken");

// GET usage logs by patient
router.get("/:patientId", verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    const result = await pool.query(
      `SELECT * FROM usage_logs 
       WHERE patient_id = $1 
       ORDER BY usage_date DESC`,
      [patientId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching usage logs:", error);
    res.status(500).json({ error: "Server error fetching usage logs" });
  }
});

// ADD daily usage hours (CRITICAL for 80h tracking)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { patient_id, usage_date, hours_used, source } = req.body;

    if (!patient_id || !usage_date || !hours_used) {
      return res.status(400).json({
        error: "patient_id, usage_date and hours_used are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO usage_logs (patient_id, usage_date, hours_used, source)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        patient_id,
        usage_date,
        hours_used,
        source || "manual",
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding usage log:", error);
    res.status(500).json({ error: "Server error adding usage log" });
  }
});

// DELETE usage log
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM usage_logs WHERE id = $1", [id]);

    res.json({ message: "Usage log deleted successfully" });
  } catch (error) {
    console.error("Error deleting usage log:", error);
    res.status(500).json({ error: "Server error deleting usage log" });
  }
});

module.exports = router;
