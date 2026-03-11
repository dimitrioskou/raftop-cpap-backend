const pool = require("../db");
const { sendAlertEmail } = require("./emailService");

async function checkComplianceAlerts(){

const patients = await pool.query(

`
SELECT
p.id,
p.name,
p.doctor_id,
u.email as doctor_email,
COALESCE(SUM(l.hours_used),0) AS monthly_hours

FROM patients p

LEFT JOIN usage_logs l
ON p.id = l.patient_id
AND DATE_TRUNC('month',l.usage_date)=DATE_TRUNC('month',CURRENT_DATE)

LEFT JOIN users u
ON p.doctor_id = u.id

GROUP BY p.id,u.email
`

);

for(const p of patients.rows){

if(p.monthly_hours < 80){

await sendAlertEmail(
p.doctor_email,
p.name,
p.monthly_hours
);

}

}

}

module.exports = { checkComplianceAlerts };