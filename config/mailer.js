// config/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.mailtrap.io',
  port: 587,
  auth: {
    // user: process.env.MAILTRAP_USER,
    // pass: process.env.MAILTRAP_PASS
    user: 'ea46a3d32a30bc', 
    pass: '550b10edf5c7e0' 
  }
});

module.exports = transporter;
