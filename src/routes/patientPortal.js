const express = require("express")
const router = express.Router()
const pool = require("../db")
const therapyScore = require("../utils/therapyScore")

router.get("/:id", async (req,res)=>{

try{

const patientId = req.params.id

const patient = await pool.query(`
SELECT *
FROM patients
WHERE id=$1
`,[patientId])

if(patient.rows.length===0){

return res.status(404).json({
error:"patient not found"
})

}

const usage = await pool.query(`
SELECT usage_date,hours_used,ahi,mask_leak
FROM usage_logs
WHERE patient_id=$1
ORDER BY usage_date DESC
LIMIT 30
`,[patientId])

const score = therapyScore(usage.rows)

res.json({

patient:patient.rows[0],
usage:usage.rows,
therapy_score:score

})

}catch(err){

console.error(err)

res.status(500).json({
error:"patient portal error"
})

}

})

module.exports = router