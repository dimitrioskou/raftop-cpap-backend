function generateActivationCode(){

const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
const numbers = "23456789"

let code = "CPAP-"

for(let i=0;i<4;i++){
code += letters[Math.floor(Math.random()*letters.length)]
}

code += "-"

for(let i=0;i<4;i++){
code += numbers[Math.floor(Math.random()*numbers.length)]
}

return code

}

module.exports = generateActivationCode