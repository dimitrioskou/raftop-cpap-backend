const express = require("express")
const router = express.Router()
const pool = require("../db")
const { authenticateToken } = require("../middleware/authMiddleware")

// ============================
// PATIENT ANALYTICS
// ============================

router.get("/patient/:id", authenticateToken, async (req,res)=>{

try{

const patientId=req.params.id

// usage last 30 days
const usage=await pool.query(`

SELECT
usage_date,
hours_used,
ahi,
leak,
pressure

FROM usage_logs

WHERE patient_id=$1
AND usage_date >= CURRENT_DATE - INTERVAL '30 days'

ORDER BY usage_date

`,[patientId])

// averages
const metrics=await pool.query(`

SELECT
AVG(hours_used) as avg_hours,
AVG(ahi) as avg_ahi,
AVG(leak) as avg_leak,
AVG(pressure) as avg_pressure

FROM usage_logs
WHERE patient_id=$1

`,[patientId])

// adherence score
const adherenceScore=await pool.query(`

SELECT
ROUND(
100 * AVG(
CASE
WHEN hours_used >= 4 THEN 1
ELSE 0
END
),2
) as adherence_score

FROM usage_logs

WHERE patient_id=$1

`,[patientId])

res.json({

usage:usage.rows,
metrics:metrics.rows[0],
adherence:adherenceScore.rows[0]

})

}catch(err){

console.error(err)

res.status(500).json({
error:"analytics error"
})

}

})

module.exports=router