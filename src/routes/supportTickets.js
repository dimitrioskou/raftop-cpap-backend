const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../supabase");

router.post("/api/support/tickets", async (req, res) => {
  try {
    const { full_name, email, category, message } = req.body || {};
    if (!full_name || !email || !category || !message) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const { data, error } = await supabaseAdmin.from("support_tickets").insert({
      full_name,
      email,
      category,
      message,
      status: "open"
    }).select("*").single();

    if (error) return res.status(500).json({ error: "Insert failed" });
    res.json({ ok: true, ticket: data });
  } catch {
    res.status(500).json({ error:"Ticket failed" });
  }
});

module.exports = router;
