const express = require("express")
const router = express.Router()
const pool = require("../db")

// list inventory
router.get("/", async(req,res)=>{

const devices = await pool.query(`
SELECT *
FROM device_inventory
ORDER BY created_at DESC
`)

res.json(devices.rows)

})

// assign device
router.post("/assign", async(req,res)=>{

const {serial,patient_id} = req.body

await pool.query(`
UPDATE device_inventory
SET status='assigned',
assigned_patient=$1,
assigned_date=NOW()
WHERE serial_number=$2
`,[patient_id,serial])

res.json({success:true})

})

module.exports = router