const express = require("express")
const router = express.Router()
const pool = require("../db")

// =======================
// CREATE SUBSCRIPTION
// =======================

router.post("/create", async(req,res)=>{

try{

const {
doctor_id,
plan,
price
} = req.body

const start = new Date()

const end = new Date()
end.setFullYear(end.getFullYear()+1)

const result = await pool.query(`
INSERT INTO doctor_subscriptions
(doctor_id,plan,price,status,start_date,end_date)
VALUES ($1,$2,$3,'active',$4,$5)
RETURNING *
`,
[doctor_id,plan,price,start,end]
)

res.json(result.rows[0])

}catch(err){

console.error(err)

res.status(500).json({
error:"subscription creation failed"
})

}

})

// =======================
// GET DOCTOR SUBSCRIPTION
// =======================

router.get("/:doctorId", async(req,res)=>{

const doctorId = req.params.doctorId

const result = await pool.query(`
SELECT *
FROM doctor_subscriptions
WHERE doctor_id=$1
ORDER BY created_at DESC
LIMIT 1
`,[doctorId])

res.json(result.rows[0])

})

module.exports = router