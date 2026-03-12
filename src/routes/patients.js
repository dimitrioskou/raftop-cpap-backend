const express = require("express")
const router = express.Router()
const supabase = require("../supabase")

// GET patients
router.get("/patients", async (req, res) => {

  const { data, error } = await supabase
    .from("patients")
    .select("*")

  if (error) {
    return res.status(500).json(error)
  }

  res.json(data)

})

// CREATE patient
router.post("/patients", async (req, res) => {

  const { first_name, last_name, phone } = req.body

  const { data, error } = await supabase
    .from("patients")
    .insert([
      { first_name, last_name, phone }
    ])

  if (error) {
    return res.status(500).json(error)
  }

  res.json(data)

})

module.exports = router