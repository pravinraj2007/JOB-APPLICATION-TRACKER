const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationCode = async ({ email, code }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials are not configured. Set EMAIL_USER and EMAIL_PASS in the environment.');
  }

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your JobTrack verification code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
        <h2 style="margin-bottom: 12px; color: #111827;">Verify your email</h2>
        <p style="color: #374151;">Use the code below to complete your JobTrack signup:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background: #111827; color: #ffffff; padding: 18px; border-radius: 10px; text-align: center; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #6b7280;">This code expires in 10 minutes.</p>
      </div>
    `,
  });
};

module.exports = { sendVerificationCode };
