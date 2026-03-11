const express = require("express")
const router = express.Router()

const pool = require("../db")

// ==============================
// GET PATIENT FULL DETAIL
// ==============================

router.get("/:id", async (req,res)=>{

try{

const {id} = req.params

const patient = await pool.query(`
SELECT *
FROM patients
WHERE id=$1
`,[id])

const devices = await pool.query(`
SELECT *
FROM devices
WHERE patient_id=$1
`,[id])

const usage = await pool.query(`
SELECT *
FROM usage
WHERE patient_id=$1
ORDER BY date DESC
LIMIT 30
`,[id])

res.json({

patient: patient.rows[0],
devices: devices.rows,
usage: usage.rows

})

}catch(err){

console.error(err)

res.status(500).json({
error:"Failed to fetch patient details"
})

}

})

module.exports = router