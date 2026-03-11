const express = require("express")
const router = express.Router()

const pool = require("../db")

// ============================
// GET ALL PATIENTS
// ============================

router.get("/", async (req, res) => {

try {

const result = await pool.query(`
SELECT * FROM patients
ORDER BY id DESC
`)

res.json(result.rows)

} catch (err) {

console.error(err)

res.status(500).json({
error: "Failed to fetch patients"
})

}

})


// ============================
// GET PATIENT BY ID
// ============================

router.get("/:id", async (req, res) => {

try {

const { id } = req.params

const result = await pool.query(
"SELECT * FROM patients WHERE id=$1",
[id]
)

res.json(result.rows[0])

} catch (err) {

console.error(err)

res.status(500).json({
error: "Patient not found"
})

}

})


// ============================
// CREATE PATIENT
// ============================

router.post("/", async (req, res) => {

try {

const {
name,
email,
phone,
dob
} = req.body

const result = await pool.query(
`
INSERT INTO patients
(name,email,phone,dob)
VALUES ($1,$2,$3,$4)
RETURNING *
`,
[name,email,phone,dob]
)

res.json(result.rows[0])

} catch (err) {

console.error(err)

res.status(500).json({
error: "Failed to create patient"
})

}

})


// ============================
// UPDATE PATIENT
// ============================

router.put("/:id", async (req, res) => {

try {

const { id } = req.params
const { name,email,phone } = req.body

await pool.query(
`
UPDATE patients
SET name=$1,email=$2,phone=$3
WHERE id=$4
`,
[name,email,phone,id]
)

res.json({
message:"Patient updated"
})

} catch (err) {

console.error(err)

res.status(500).json({
error:"Update failed"
})

}

})


// ============================
// DELETE PATIENT
// ============================

router.delete("/:id", async (req,res)=>{

try{

const {id} = req.params

await pool.query(
"DELETE FROM patients WHERE id=$1",
[id]
)

res.json({
message:"Patient deleted"
})

}catch(err){

console.error(err)

res.status(500).json({
error:"Delete failed"
})

}

})

module.exports = router