const express = require("express")
const router = express.Router()
const pool = require("../db")

router.get("/", async(req,res)=>{

try{

// total patients
const total = await pool.query(`
SELECT COUNT(*) FROM patients
`)

// compliant patients
const compliant = await pool.query(`
SELECT COUNT(*) FROM patients
WHERE compliance_status='COMPLIANT'
`)

// non compliant
const noncompliant = await pool.query(`
SELECT COUNT(*) FROM patients
WHERE compliance_status='NON_COMPLIANT'
`)

// high ahi
const ahi = await pool.query(`
SELECT COUNT(*) 
FROM usage_logs
WHERE ahi > 10
`)

// mask leak alerts
const leak = await pool.query(`
SELECT COUNT(*) 
FROM usage_logs
WHERE mask_leak > 24
`)

// high risk
const risk = await pool.query(`
SELECT COUNT(*) 
FROM patients
WHERE risk_level='HIGH'
`)

res.json({

patients:total.rows[0].count,
compliant:compliant.rows[0].count,
noncompliant:noncompliant.rows[0].count,
ahi_alerts:ahi.rows[0].count,
mask_leak_alerts:leak.rows[0].count,
high_risk:risk.rows[0].count

})

}catch(err){

console.error(err)

res.status(500).json({error:"analytics failed"})

}

})

module.exports = router