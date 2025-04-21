// utils/email.js
const nodemailer = require('nodemailer')
require('dotenv').config()
const { db } = require('../db/db')
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false, // TLS with port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

async function sendResetEmail(to, code) {
  await transporter.sendMail({
    from: `"Comunication LTD" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Password Reset Code',
    html: `<p>Your password reset code is: <b>${code}</b></p>`,
  })
  console.log(`Email sent to ${to} with code ${code}`);
  setTimeout(function(){myFunction(to)}, 10000); //change this to 600000 for it to be 10 minutes
}

async function myFunction(email) {
    await db.user.update({
      where: { email },
      data: { resetCode: null },
    })
    console.log("code deleted after 10 seconds have passed") //change this to 10 minutes
  }


module.exports = { sendResetEmail }
