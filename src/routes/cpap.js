const express = require("express");
const router = express.Router();

/*
CPAP TEST ROUTE
*/

router.get("/status", (req, res) => {
  res.json({
    system: "RAFTOP CPAP CARE",
    status: "running",
    timestamp: new Date()
  });
});

module.exports = router;