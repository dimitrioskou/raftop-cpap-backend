const express = require("express");
const router = express.Router();

router.get("/info", (req,res)=>{

if(!req.clinic){

return res.json({
clinic:"RAFTOP CPAP CARE"
})

}

res.json({

clinic:req.clinic.clinic_name,
logo:req.clinic.logo_url

})

})

module.exports=router