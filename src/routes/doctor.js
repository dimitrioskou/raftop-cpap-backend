const express = require("express")
const router = express.Router()

const pool = require("../db")

// ============================
// GET ALL DOCTORS
// ============================

router.get("/", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT id,name,email,created_at
      FROM doctors
      ORDER BY id DESC
    `)

    res.json(result.rows)

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error: "Failed to fetch doctors"
    })

  }

})


// ============================
// GET DOCTOR BY ID
// ============================

router.get("/:id", async (req, res) => {

  try {

    const { id } = req.params

    const result = await pool.query(
      "SELECT * FROM doctors WHERE id=$1",
      [id]
    )

    res.json(result.rows[0])

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error: "Doctor not found"
    })

  }

})


// ============================
// CREATE DOCTOR
// ============================

router.post("/", async (req, res) => {

  try {

    const { name, email, password } = req.body

    const result = await pool.query(`
      INSERT INTO doctors (name,email,password)
      VALUES ($1,$2,$3)
      RETURNING *
    `,
      [name, email, password]
    )

    res.json(result.rows[0])

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error: "Failed to create doctor"
    })

  }

})


// ============================
// UPDATE DOCTOR
// ============================

router.put("/:id", async (req, res) => {

  try {

    const { id } = req.params
    const { name, email } = req.body

    await pool.query(`
      UPDATE doctors
      SET name=$1,email=$2
      WHERE id=$3
    `,
      [name, email, id]
    )

    res.json({
      message: "Doctor updated"
    })

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error: "Update failed"
    })

  }

})


// ============================
// DELETE DOCTOR
// ============================

router.delete("/:id", async (req, res) => {

  try {

    const { id } = req.params

    await pool.query(
      "DELETE FROM doctors WHERE id=$1",
      [id]
    )

    res.json({
      message: "Doctor deleted"
    })

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error: "Delete failed"
    })

  }

})

module.exports = router