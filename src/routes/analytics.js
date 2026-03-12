const express = require("express");
const router = express.Router();

/*
Analytics test endpoint
*/

router.get("/analytics", (req, res) => {
  res.json({
    system: "RAFTOP CPAP CARE",
    analytics: "ok",
    timestamp: new Date()
  });
});

module.exports = router;