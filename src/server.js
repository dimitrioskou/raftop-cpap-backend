const express = require("express");
const cors = require("cors");
require("dotenv").config();

const patientsRoutes = require("./routes/patients");

const app = express();

app.use(cors());
app.use(express.json());

/* HEALTH CHECK */
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "RAFTOP CPAP CARE API",
    time: new Date()
  });
});

/* PATIENT ROUTES */
app.use("/api/patients", patientsRoutes);

/* ROOT */
app.get("/", (req, res) => {
  res.send("RAFTOP CPAP CARE API");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});