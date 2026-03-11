// ===============================
// RAFTOP CPAP CARE BACKEND SERVER
// ===============================

const express = require("express")
const cors = require("cors")
const morgan = require("morgan")

const app = express()

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors())
app.use(express.json())
app.use(morgan("dev"))


// ===============================
// ROUTES IMPORT
// ===============================

const patientsRoutes = require("./routes/patients")
const doctorRoutes = require("./routes/doctor")
const cpapRoutes = require("./routes/cpap")
const devicesRoutes = require("./routes/devices")
const reportsRoutes = require("./routes/reports")
const analyticsRoutes = require("./routes/analytics")
const vendorsRoutes = require("./routes/vendors")


// ===============================
// API ROUTES
// ===============================

app.use("/api/patients", patientsRoutes)
app.use("/api/doctors", doctorRoutes)
app.use("/api/cpap", cpapRoutes)
app.use("/api/devices", devicesRoutes)
app.use("/api/reports", reportsRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/vendors", vendorsRoutes)


// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "RAFTOP CPAP CARE API",
    time: new Date()
  })
})


// ===============================
// ROOT ROUTE
// ===============================

app.get("/", (req, res) => {
  res.send("RAFTOP CPAP CARE API is running")
})


// ===============================
// ERROR HANDLER
// ===============================

app.use((err, req, res, next) => {
  console.error(err)

  res.status(500).json({
    error: "Internal server error"
  })
})


// ===============================
// SERVER START
// ===============================

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})