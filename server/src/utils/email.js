const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (options) => {
  if (process.env.NODE_ENV === 'production') {
    const msg = {
      to: options.email,
      from: `Natours Team <${process.env.EMAIL_FROM}>`,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };
    await sgMail.send(msg);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const emailOptions = {
    from: `Natours Team <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  await transporter.sendMail(emailOptions);
};

module.exports = sendEmail;
