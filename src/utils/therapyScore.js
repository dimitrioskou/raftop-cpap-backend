function calculateTherapyScore(usage){

let score = 0

// Average hours
const avgHours =
usage.reduce((sum,u)=>sum + Number(u.hours_used || 0),0) / usage.length

// Average AHI
const avgAHI =
usage.reduce((sum,u)=>sum + Number(u.ahi || 0),0) / usage.length

// Average leak
const avgLeak =
usage.reduce((sum,u)=>sum + Number(u.mask_leak || 0),0) / usage.length

// HOURS SCORE
if(avgHours >= 7) score += 40
else if(avgHours >= 5) score += 30
else if(avgHours >= 3) score += 20
else score += 10

// AHI SCORE
if(avgAHI <= 5) score += 30
else if(avgAHI <= 10) score += 20
else score += 10

// LEAK SCORE
if(avgLeak <= 10) score += 30
else if(avgLeak <= 20) score += 20
else score += 10

return {
score,
avgHours,
avgAHI,
avgLeak
}

}

module.exports = calculateTherapyScore