const express = require("express")
const router = express.Router()
const pool = require("../db")

router.get("/", async(req,res)=>{

const revenue = await pool.query(`
SELECT SUM(price) as total_revenue
FROM doctor_subscriptions
WHERE status='active'
`)

const doctors = await pool.query(`
SELECT COUNT(*) FROM doctors
`)

res.json({
revenue:revenue.rows[0].total_revenue,
doctors:doctors.rows[0].count
})

})

module.exports = router