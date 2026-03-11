const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifyToken = require("../middleware/verifyToken");

// List unresolved alerts (latest first)
router.get("/", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT a.*, p.name
      FROM alerts a
      JOIN patients p ON p.id = a.patient_id
      WHERE a.resolved = FALSE
      ORDER BY a.created_at DESC
      LIMIT 200
      `
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ error: "Server error fetching alerts" });
  }
});

// Resolve alert
router.post("/:id/resolve", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE alerts SET resolved = TRUE WHERE id = $1`, [id]);
    res.json({ message: "Alert resolved" });
  } catch (error) {
    console.error("Error resolving alert:", error);
    res.status(500).json({ error: "Server error resolving alert" });
  }
});

module.exports = router;
