const express = require("express")
const router = express.Router()
const pool = require("../db")
const generateCode = require("../utils/generateActivationCode")

// ======================
// CREATE ACTIVATION CODE
// ======================

router.post("/create-code", async (req,res)=>{

try{

const { patient_id, plan_name, price_yearly } = req.body

const code = generateCode()

const result = await pool.query(
`
INSERT INTO patient_activation_codes
(patient_id,activation_code,plan_name,price_yearly)
VALUES($1,$2,$3,$4)
RETURNING *
`,
[patient_id,code,plan_name,price_yearly]
)

res.json({
success:true,
code:result.rows[0]
})

}catch(err){

console.error(err)
res.status(500).json({error:"code creation failed"})

}

})


// ======================
// ACTIVATE SUBSCRIPTION
// ======================

router.post("/activate", async (req,res)=>{

try{

const { activation_code } = req.body

const codeCheck = await pool.query(
`
SELECT *
FROM patient_activation_codes
WHERE activation_code = $1
AND status='unused'
`,
[activation_code]
)

if(codeCheck.rows.length===0){

return res.status(400).json({
error:"invalid code"
})

}

const code = codeCheck.rows[0]

await pool.query(
`
INSERT INTO patient_subscriptions
(patient_id,plan_name,price_yearly,start_date,end_date)
VALUES($1,$2,$3,CURRENT_DATE,CURRENT_DATE + INTERVAL '365 days')
`,
[
code.patient_id,
code.plan_name,
code.price_yearly
]
)

await pool.query(
`
UPDATE patient_activation_codes
SET status='used'
WHERE id=$1
`,
[code.id]
)

res.json({
success:true,
message:"Subscription activated"
})

}catch(err){

console.error(err)
res.status(500).json({error:"activation failed"})

}

})

module.exports = router