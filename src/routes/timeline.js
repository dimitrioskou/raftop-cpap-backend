const express = require("express")
const router = express.Router()

const pool = require("../db")

// ===============================
// GET PATIENT TIMELINE
// ===============================

router.get("/:patientId", async (req,res)=>{

try{

const {patientId} = req.params

const result = await pool.query(`
SELECT *
FROM timeline
WHERE patient_id=$1
ORDER BY created_at DESC
`,[patientId])

res.json(result.rows)

}catch(err){

console.error(err)

res.status(500).json({
error:"Timeline fetch failed"
})

}

})


// ===============================
// ADD TIMELINE EVENT
// ===============================

router.post("/", async (req,res)=>{

try{

const {
patient_id,
event_type,
description
} = req.body

await pool.query(`
INSERT INTO timeline
(patient_id,event_type,description)
VALUES ($1,$2,$3)
`,
[
patient_id,
event_type,
description
]
)

res.json({
message:"Timeline event added"
})

}catch(err){

console.error(err)

res.status(500).json({
error:"Insert failed"
})

}

})

module.exports = router