const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")

dotenv.config()

const app = express()

// =============================
// MIDDLEWARE
// =============================

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// =============================
// HEALTH CHECK
// =============================

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "RAFTOP CPAP CARE API",
    time: new Date()
  })
})

// =============================
// ROUTES IMPORT
// =============================

const authRoutes = require("./routes/auth")
const patientsRoutes = require("./routes/patients")
const doctorRoutes = require("./routes/doctor")
const adminRoutes = require("./routes/admin")
const analyticsRoutes = require("./routes/analytics")
const alertsRoutes = require("./routes/alerts")
const billingRoutes = require("./routes/billing")
const clinicRoutes = require("./routes/clinics")
const clinicalAnalyticsRoutes = require("./routes/clinicalAnalytics")
const complianceRoutes = require("./routes/compliance")
const devicesRoutes = require("./routes/devices")
const inventoryRoutes = require("./routes/inventory")
const medicalReportsRoutes = require("./routes/medicalReports")
const notesRoutes = require("./routes/notes")
const patientAuthRoutes = require("./routes/patientAuth")
const patientDetailRoutes = require("./routes/patientDetail")
const patientPortalRoutes = require("./routes/patientPortal")
const patientSubscriptionsRoutes = require("./routes/patientSubscriptions")
const reportsRoutes = require("./routes/reports")
const resmedRoutes = require("./routes/resmed")
const resmedImportRoutes = require("./routes/resmedImport")
const revenueRoutes = require("./routes/revenue")
const supportTicketsRoutes = require("./routes/supportTickets")
const supportTicketsAdminRoutes = require("./routes/supportTicketsAdminV2")
const timelineRoutes = require("./routes/timeline")
const usageRoutes = require("./routes/usage")
const vendorsRoutes = require("./routes/vendors")

// =============================
// ROUTES
// =============================

app.use("/api/auth", authRoutes)
app.use("/api/patients", patientsRoutes)
app.use("/api/doctor", doctorRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/alerts", alertsRoutes)
app.use("/api/billing", billingRoutes)
app.use("/api/clinics", clinicRoutes)
app.use("/api/clinical-analytics", clinicalAnalyticsRoutes)
app.use("/api/compliance", complianceRoutes)
app.use("/api/devices", devicesRoutes)
app.use("/api/inventory", inventoryRoutes)
app.use("/api/medical-reports", medicalReportsRoutes)
app.use("/api/notes", notesRoutes)
app.use("/api/patient-auth", patientAuthRoutes)
app.use("/api/patient-detail", patientDetailRoutes)
app.use("/api/patient-portal", patientPortalRoutes)
app.use("/api/patient-subscriptions", patientSubscriptionsRoutes)
app.use("/api/reports", reportsRoutes)
app.use("/api/resmed", resmedRoutes)
app.use("/api/resmed-import", resmedImportRoutes)
app.use("/api/revenue", revenueRoutes)
app.use("/api/support", supportTicketsRoutes)
app.use("/api/support-admin", supportTicketsAdminRoutes)
app.use("/api/timeline", timelineRoutes)
app.use("/api/usage", usageRoutes)
app.use("/api/vendors", vendorsRoutes)

// =============================
// ROOT ROUTE
// =============================

app.get("/", (req, res) => {
  res.send("RAFTOP CPAP CARE API is running")
})

// =============================
// ERROR HANDLER
// =============================

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({
    error: "Internal server error"
  })
})

// =============================
// SERVER START
// =============================

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})