import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendEmail = async (to, subject, html) => {
  console.log("DEBUG: MAIL_USER is", process.env.MAIL_USER ? "SET" : "NOT SET");
  console.log("DEBUG: MAIL_PASS is", process.env.MAIL_PASS ? "SET" : "NOT SET");

  // If no mail credentials, log to console (Mock mode)
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log("==================================================");
    console.log(`[MOCK EMAIL] To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("Body:", html);
    console.log("==================================================");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: '"Intern Project" <no-reply@example.com>', // sender address
      to, // list of receivers
      subject, // Subject line
      html, // html body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
