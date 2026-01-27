require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (req,res)=> res.json({ ok:true }));

const supportTickets = require("./routes/supportTickets");
const supportTicketsAdminV2 = require("./routes/supportTicketsAdminV2");
const coach = require("./routes/coach");

app.use(supportTickets);
app.use(supportTicketsAdminV2);
app.use(coach);

const PORT = 3000;
app.listen(PORT, ()=> console.log("API running on", PORT));

