const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const patientsRoutes = require("./routes/patients");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "RAFTOP CPAP CARE API",
    time: new Date()
  });
});

// Routes
app.use("/api", patientsRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "RAFTOP CPAP CARE API running"
  });
});

// PORT
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});