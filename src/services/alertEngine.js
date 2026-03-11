const pool = require("../db")

async function generateAlerts(){

const patients = await pool.query(`
SELECT id,name,compliance_status,risk_level
FROM patients
`)

for(const p of patients.rows){

if(p.compliance_status === "NON_COMPLIANT"){

await pool.query(`
INSERT INTO alerts
(patient_id,type,message)
VALUES ($1,'compliance','Patient non compliant')
`,[p.id])

}

if(p.risk_level === "HIGH"){

await pool.query(`
INSERT INTO alerts
(patient_id,type,message)
VALUES ($1,'risk','High therapy drop-out risk')
`,[p.id])

}

}

}

module.exports = {generateAlerts}