const pool = require("../db")

async function calculateRiskForPatient(patientId){

const usage = await pool.query(`
SELECT
hours_used,
ahi,
mask_leak
FROM usage_logs
WHERE patient_id=$1
AND usage_date > NOW() - INTERVAL '30 days'
`,[patientId])

if(usage.rows.length === 0){
return {score:0,level:"UNKNOWN"}
}

let totalHours = 0
let ahiSum = 0
let leakSum = 0

usage.rows.forEach(r=>{
totalHours += Number(r.hours_used || 0)
ahiSum += Number(r.ahi || 0)
leakSum += Number(r.mask_leak || 0)
})

const avgHours = totalHours / usage.rows.length
const avgAHI = ahiSum / usage.rows.length
const avgLeak = leakSum / usage.rows.length

let score = 0

// usage factor
if(avgHours < 2) score += 40
else if(avgHours < 4) score += 25
else if(avgHours < 6) score += 10

// ahi factor
if(avgAHI > 10) score += 25
else if(avgAHI > 5) score += 10

// leak factor
if(avgLeak > 24) score += 20
else if(avgLeak > 10) score += 10

let level = "LOW"

if(score > 60) level = "HIGH"
else if(score > 30) level = "MEDIUM"

await pool.query(`
UPDATE patients
SET risk_score=$1,
risk_level=$2
WHERE id=$3
`,[score,level,patientId])

return {score,level}

}

async function runRiskEngine(){

const patients = await pool.query(`
SELECT id FROM patients
`)

for(const p of patients.rows){

await calculateRiskForPatient(p.id)

}

console.log("AI Risk Engine Completed")

}

module.exports = {
runRiskEngine
}