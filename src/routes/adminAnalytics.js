const express = require("express")
const router = express.Router()
const pool = require("../db")
const { authenticateToken } = require("../middleware/authMiddleware")

// =================================
// DOCTOR WORKLOAD
// =================================

router.get("/doctor-workload", authenticateToken, async (req,res)=>{

try{

const result = await pool.query(`

SELECT
u.id,
u.name,
COUNT(p.id) as patients

FROM users u

LEFT JOIN patients p
ON u.id = p.doctor_id

WHERE u.role='doctor'

GROUP BY u.id
ORDER BY patients DESC

`)

res.json({
doctors:result.rows
})

}catch(err){

console.error(err)

res.status(500).json({
error:"failed to load doctor workload"
})

}

})

// =================================
// UNASSIGNED PATIENTS
// =================================

router.get("/unassigned-patients", authenticateToken, async (req,res)=>{

try{

const result = await pool.query(`

SELECT *
FROM patients
WHERE doctor_id IS NULL

`)

res.json({
patients:result.rows
})

}catch(err){

console.error(err)

res.status(500).json({
error:"failed"
})

}

})

// =================================
// GLOBAL COMPLIANCE
// =================================

router.get("/compliance", authenticateToken, async (req,res)=>{

try{

const result = await pool.query(`

SELECT
COUNT(*) FILTER (WHERE cpap_hours >= 80) as compliant,
COUNT(*) FILTER (WHERE cpap_hours < 80) as non_compliant

FROM patients

`)

res.json(result.rows[0])

}catch(err){

console.error(err)

res.status(500).json({
error:"failed"
})

}

})

// =================================
// DOCTOR ALERT LOAD
// =================================

router.get("/doctor-alerts", authenticateToken, async (req,res)=>{

try{

const result = await pool.query(`

SELECT
u.name as doctor,
COUNT(p.id) as alerts

FROM patients p

JOIN users u
ON p.doctor_id = u.id

WHERE p.cpap_hours < 80

GROUP BY u.name
ORDER BY alerts DESC

`)

res.json({
alerts:result.rows
})

}catch(err){

console.error(err)

res.status(500).json({
error:"failed"
})

}

})

module.exports=router