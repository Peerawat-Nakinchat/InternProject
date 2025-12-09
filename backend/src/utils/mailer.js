import nodemailer from "nodemailer";
import crypto from "crypto";

// Ensure environment variables from secrets/.env are loaded
import "../config/loadEnv.js";

// ✅ Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.MAIL_PORT) || 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  // ✅ เพิ่ม connection settings เพื่อความเสถียร
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

/**
 * ✅ Helper: สร้างข้อความ plain text จาก HTML
 */
const htmlToPlainText = (html) => {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
};

/**
 * ✅ Helper: สร้าง Message-ID ที่ unique
 */
const generateMessageId = () => {
  const randomPart = crypto.randomBytes(16).toString("hex");
  const domain = process.env.MAIL_USER?.split("@")[1] || "localhost";
  return `<${randomPart}.${Date.now()}@${domain}>`;
};

export const sendEmail = async (to, subject, html) => {
  console.log("📧 Preparing to send email...");
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
    // ✅ สร้าง plain text version (ช่วยลด spam score)
    const textContent = htmlToPlainText(html);

    // ✅ ใช้ email address ของ MAIL_USER เพื่อให้ตรงกับ SPF/DKIM
    const senderEmail = process.env.MAIL_USER;
    const senderName = process.env.MAIL_FROM_NAME || "Intern Project";

    const info = await transporter.sendMail({
      // ✅ From: ใช้ email เดียวกับ MAIL_USER (สำคัญมาก!)
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,

      // ✅ ส่งทั้ง HTML และ Plain Text (Multipart - ช่วยลด spam score)
      text: textContent,
      html: html,

      // ✅ Headers ที่ช่วยลดโอกาสโดน spam
      headers: {
        "Message-ID": generateMessageId(),
        "X-Priority": "3", // Normal priority (1=high, 3=normal, 5=low)
        "X-Mailer": "Intern Project Mailer",
        Precedence: "bulk", // บอกว่าเป็น bulk mail
      },

      // ✅ Reply-To (ถ้าต้องการให้ตอบกลับไปที่ email อื่น)
      replyTo: process.env.MAIL_REPLY_TO || senderEmail,
    });

    console.log("✅ Email sent successfully!");
    console.log("Message ID: %s", info.messageId);
    console.log("Accepted: %s", info.accepted?.join(", "));

    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};
