const express = require("express")
const router = express.Router()
const pool = require("../db")
const bcrypt = require("bcryptjs")

// =====================
// ACTIVATE ACCOUNT
// =====================

router.post("/activate", async (req,res)=>{

try{

const { activation_code,email,password } = req.body

const code = await pool.query(
`
SELECT *
FROM patient_activation_codes
WHERE activation_code=$1
AND status='unused'
`,
[activation_code]
)

if(code.rows.length===0){

return res.status(400).json({
error:"Invalid activation code"
})

}

const patientId = code.rows[0].patient_id

const hashed = await bcrypt.hash(password,10)

await pool.query(
`
UPDATE patients
SET email=$1,password=$2
WHERE id=$3
`,
[email,hashed,patientId]
)

await pool.query(
`
UPDATE patient_activation_codes
SET status='used'
WHERE id=$1
`,
[code.rows[0].id]
)

res.json({
success:true,
message:"Patient account activated"
})

}catch(err){

console.error(err)

res.status(500).json({
error:"Activation failed"
})

}

})


// =====================
// LOGIN
// =====================

router.post("/login", async (req,res)=>{

try{

const { email,password } = req.body

const patient = await pool.query(
`
SELECT *
FROM patients
WHERE email=$1
`,
[email]
)

if(patient.rows.length===0){

return res.status(400).json({
error:"Invalid login"
})

}

const valid = await bcrypt.compare(
password,
patient.rows[0].password
)

if(!valid){

return res.status(400).json({
error:"Invalid password"
})

}

res.json({

success:true,
patient:patient.rows[0]

})

}catch(err){

console.error(err)

res.status(500).json({
error:"Login failed"
})

}

})

module.exports = router