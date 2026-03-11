const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateToken } = require("../middleware/authMiddleware");

// ===============================
// GET NOTES
// ===============================

router.get("/:patientId", authenticateToken, async (req,res)=>{

try{

const result = await pool.query(

`SELECT 
n.id,
n.note,
n.created_at,
u.name as doctor

FROM clinical_notes n

LEFT JOIN users u
ON n.doctor_id = u.id

WHERE n.patient_id = $1

ORDER BY n.created_at DESC

`,
[req.params.patientId]

)

res.json({
notes:result.rows
})

}catch(err){

console.error(err)

res.status(500).json({
error:"Failed to load notes"
})

}

})

// ===============================
// ADD NOTE
// ===============================

router.post("/", authenticateToken, async (req,res)=>{

try{

const {patient_id,note} = req.body

const result = await pool.query(

`INSERT INTO clinical_notes
(patient_id,doctor_id,note)
VALUES ($1,$2,$3)
RETURNING *`,

[
patient_id,
req.user.id,
note
]

)

res.json({
success:true,
note:result.rows[0]
})

}catch(err){

console.error(err)

res.status(500).json({
error:"Failed to create note"
})

}

})

module.exports = router