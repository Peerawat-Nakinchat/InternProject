// src/services/queueService.js
import PgBoss from "pg-boss";
import { sendEmail } from "../utils/mailer.js";
import logger from "../utils/logger.js";

let boss;

/**
 * เริ่มต้นระบบ Queue (เรียกครั้งเดียวตอนเปิด Server)
 */
export const startQueueSystem = async () => {
  // 1. ดึงค่า Config จาก Environment Variables (ตัวเดียวกับที่ Main App ใช้)
  const bossConfig = {
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    ssl: false,
  };

  // เช็คความเรียบร้อย (Debug)
  if (!bossConfig.password) {
    logger.warn(
      "⚠️ Warning: DB_PASSWORD is missing for Queue System. Connection might fail.",
    );
  }

  // 2. สร้าง Instance ของ PgBoss
  boss = new PgBoss(bossConfig);

  boss.on("error", (error) => logger.error("❌ Queue System Error:", error));

  try {
    await boss.start();
    logger.info(
      `✅ Queue System Started (pg-boss) connected to DB: ${bossConfig.database}`,
    );
  } catch (err) {
    logger.error(
      "❌ Failed to connect Queue to Database. Check your .env variables.",
    );
    throw err;
  }

  // ===============================================
  // 👷 REGISTER WORKERS (คนทำงาน)
  // ===============================================

  // 🔥 FIX: pg-boss v10 requires creating queue before use
  const QUEUE_NAME = "send-email";

  try {
    // ลบ queue เก่าที่อาจ corrupt (ถ้ามี)
    try {
      await boss.deleteQueue(QUEUE_NAME);
      logger.info(`🗑️ Old queue "${QUEUE_NAME}" deleted`);
    } catch (delErr) {
      // ไม่เป็นไร ถ้าไม่มี queue เดิม
    }

    // สร้าง queue ใหม่
    await boss.createQueue(QUEUE_NAME);
    logger.info(`✅ Queue "${QUEUE_NAME}" created successfully!`);
  } catch (err) {
    logger.error(`❌ Failed to setup queue "${QUEUE_NAME}":`, err.message);
  }

  // Worker สำหรับงานส่งอีเมล (pg-boss v10: ใช้ batchSize: 1 เพื่อรับ single job)
  await boss.work(QUEUE_NAME, { batchSize: 1 }, async ([job]) => {
    logger.info(`\n🔔 ========== EMAIL WORKER TRIGGERED ==========`);
    logger.info(`📋 Job ID: ${job.id}`);

    const { to, subject, html } = job.data;

    logger.info(`📨 Processing email job for: ${to}`);

    try {
      // เรียกใช้ Mailer ของจริง
      await sendEmail(to, subject, html);
      logger.info(`✅ Email sent to ${to}`);
    } catch (error) {
      logger.error(`❌ Failed to send email to ${to}:`, error.message);
      throw error;
    }
  });

  logger.info(`👷 Email worker registered for queue "${QUEUE_NAME}"`);
};

/**
 * ฟังก์ชันสำหรับฝากงานเข้าคิว (Controller/Service เรียกใช้ตัวนี้)
 * @param {object} data - { to, subject, html }
 */
export const addEmailJob = async (data) => {
  logger.info("📬 addEmailJob called with:", {
    to: data.to,
    subject: data.subject,
  });

  if (!boss) {
    logger.error("❌ Boss instance is null/undefined!");
    throw new Error(
      "Queue system not initialized! Call startQueueSystem() first.",
    );
  }

  try {
    const jobId = await boss.send("send-email", data, {
      retryLimit: 3,
      expireInSeconds: 300,
    });
    logger.info(`✅ Email job queued successfully! Job ID: ${jobId}`);
    return jobId;
  } catch (error) {
    logger.error("❌ Failed to queue email job:", error.message);
    throw error;
  }
};
