const express = require("express");
const router = express.Router();
const pool = require("../db.js");

router.get("/admin/support/tickets", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM support_tickets ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Admin tickets error" });
  }
});

module.exports = router;
