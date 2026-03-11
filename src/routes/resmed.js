const express = require("express")
const router = express.Router()

const pool = require("../db")

// =====================================
// GET RESMED DEVICES
// =====================================

router.get("/devices", async (req,res)=>{

try{

const result = await pool.query(`
SELECT * FROM devices
WHERE vendor='ResMed'
ORDER BY id DESC
`)

res.json(result.rows)

}catch(err){

console.error(err)

res.status(500).json({
error:"Failed to fetch devices"
})

}

})


// =====================================
// GET PATIENT USAGE
// =====================================

router.get("/usage/:patientId", async (req,res)=>{

try{

const {patientId} = req.params

const result = await pool.query(`
SELECT *
FROM usage
WHERE patient_id=$1
ORDER BY date DESC
LIMIT 30
`,[patientId])

res.json(result.rows)

}catch(err){

console.error(err)

res.status(500).json({
error:"Usage fetch failed"
})

}

})


// =====================================
// IMPORT RESMED CSV
// =====================================

router.post("/import", async (req,res)=>{

try{

const {serial_number,patient_id,usage_hours,ahi,leak} = req.body

await pool.query(`
INSERT INTO usage
(serial_number,patient_id,usage_hours,ahi,leak)
VALUES ($1,$2,$3,$4,$5)
`,
[
serial_number,
patient_id,
usage_hours,
ahi,
leak
]
)

res.json({
message:"ResMed data imported"
})

}catch(err){

console.error(err)

res.status(500).json({
error:"Import failed"
})

}

})


module.exports = router