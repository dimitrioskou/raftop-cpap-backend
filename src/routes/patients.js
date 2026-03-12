const express = require("express");
const router = express.Router();
const supabase = require("../supabase");

/* GET ALL PATIENTS */
router.get("/", async (req, res) => {
  try {

    const { data, error } = await supabase
      .from("patients")
      .select("*");

    if (error) throw error;

    res.json(data);

  } catch (err) {

    res.status(500).json({
      error: "Failed to fetch patients",
      message: err.message
    });

  }
});

module.exports = router;