const express = require("express")
const router = express.Router()
const pool = require("../db")

router.get("/risk/:id", async(req,res)=>{

const patientId = req.params.id

const patient = await pool.query(`
SELECT name,risk_score,risk_level
FROM patients
WHERE id=$1
`,[patientId])

res.json(patient.rows[0])

})

module.exports = router