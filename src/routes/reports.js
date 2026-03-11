const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const pool = require("../db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "cpap_secret_key";

// AUTH
function authenticate(req,res,next){

const header = req.headers.authorization;

if(!header)
return res.status(401).json({error:"token required"});

const token = header.split(" ")[1];

try{

const decoded = jwt.verify(token,JWT_SECRET);

req.user = decoded;

next();

}catch(err){

return res.status(401).json({error:"invalid token"});

}

}


// ====================================
// PDF REPORT
// ====================================

router.get("/patient/:id", authenticate, async (req,res)=>{

try{

const doctorId = req.user.id;
const patientId = req.params.id;

const patient = await pool.query(

`
SELECT *
FROM patients
WHERE id=$1 AND doctor_id=$2
`,
[patientId,doctorId]

);

if(patient.rows.length===0)
return res.status(404).json({error:"patient not found"});


const usage = await pool.query(

`
SELECT usage_date,hours_used
FROM usage_logs
WHERE patient_id=$1
ORDER BY usage_date DESC
LIMIT 30
`,
[patientId]

);


const p = patient.rows[0];


const doc = new PDFDocument();


res.setHeader(
"Content-Type",
"application/pdf"
);

res.setHeader(
"Content-Disposition",
`inline; filename=cpap-report-${p.id}.pdf`
);


doc.pipe(res);


// HEADER

doc.fontSize(20)
.text("CPAP COMPLIANCE REPORT",{align:"center"});

doc.moveDown();

doc.fontSize(12)
.text(`Patient: ${p.name}`);

doc.text(`Diagnosis: ${p.diagnosis}`);

doc.text(`Device Serial: ${p.device_serial}`);

doc.text(`Doctor ID: ${doctorId}`);

doc.moveDown();

doc.text("Last 30 Days Usage:");

doc.moveDown();


// TABLE

usage.rows.forEach(u=>{

doc.text(
`${u.usage_date}  -  ${u.hours_used} hours`
);

});


doc.end();

}catch(err){

console.error(err);

res.status(500).json({
error:"report generation failed"
});

}

});


module.exports = router;