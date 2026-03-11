const express = require("express")
const router = express.Router()
const pool = require("../db")
const PDFDocument = require("pdfkit")

router.get("/:patientId", async(req,res)=>{

const patientId = req.params.patientId

const patient = await pool.query(`
SELECT name,cpap_hours,compliance_status
FROM patients
WHERE id=$1
`,[patientId])

const doc = new PDFDocument()

res.setHeader(
"Content-Type",
"application/pdf"
)

doc.pipe(res)

doc.fontSize(20).text("CPAP Therapy Report")

doc.moveDown()

doc.text("Patient: "+patient.rows[0].name)

doc.text("Monthly Hours: "+patient.rows[0].cpap_hours)

doc.text("Compliance: "+patient.rows[0].compliance_status)

doc.end()

})

module.exports = router