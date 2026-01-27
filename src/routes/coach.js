const express = require("express");
const router = express.Router();

router.get("/api/patient/coach/today", (req,res)=>{
  res.json({
    ok:true,
    plan:{
      message:"Σήμερα στόχος 5 ώρες CPAP.",
      motivator:"Μικρά βήματα, μεγάλη βελτίωση.",
      tip:"Φόρα τη μάσκα 30 λεπτά πριν κοιμηθείς."
    }
  });
});

module.exports = router;
