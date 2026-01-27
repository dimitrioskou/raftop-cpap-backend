const express = require("express");
const router = express.Router();
const { adminRequired } = require("../middleware/admin");
const { supabaseAdmin } = require("../supabase");

router.get("/api/admin/support/tickets", adminRequired, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error:"Fetch failed" });
  res.json({ ok:true, items:data });
});

module.exports = router;
