const express = require("express");
const router = express.Router();
const pool = require("../db.js");

router.get("/coach/patients", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM patients");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Coach error" });
  }
});

module.exports = router;
