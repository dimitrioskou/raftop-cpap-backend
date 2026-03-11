const express = require("express");
const router = express.Router();
const requireRole = require("../middleware/requireRole");

router.get("/", requireRole("admin"), (req, res) => {
  res.json({
    message: "Admin Dashboard Data",
    user: req.user
  });
});

module.exports = router;
