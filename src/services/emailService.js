const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "yourclinic@gmail.com",
    pass: "app-password"
  }
});

async function sendAlertEmail(doctorEmail, patientName, hours){

  const mailOptions = {

    from: "CPAP Monitoring <yourclinic@gmail.com>",

    to: doctorEmail,

    subject: "CPAP Compliance Alert",

    text: `
Patient: ${patientName}

Monthly CPAP usage is low.

Current hours: ${hours}

Recommended minimum: 80 hours

Please review the patient compliance.
`
  };

  await transporter.sendMail(mailOptions);

}

module.exports = { sendAlertEmail };