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

  // ✅ Worker สำหรับงานส่งอีเมล
  // - batchSize: 1 = รับทีละ 1 job ต่อ worker
  // - teamSize: 3 = มี 3 workers ทำงานพร้อมกัน (ส่ง 3 อีเมลพร้อมกัน)
  await boss.work(
    QUEUE_NAME,
    {
      batchSize: 1,
      teamSize: 3, // 🔥 เพิ่ม concurrency - 3 workers พร้อมกัน
    },
    async ([job]) => {
      const workerId = Math.random().toString(36).substring(7);
      console.log(`\n🔔 ========== EMAIL WORKER [${workerId}] ==========`);
      console.log(`📋 Job ID: ${job.id}`);


      const { to, subject, html } = job.data;
      console.log(`📨 Processing email job for: ${to}`);

      try {
        await sendEmail(to, subject, html);
        console.log(`✅ [${workerId}] Email sent to ${to}`);
      } catch (error) {
        console.error(
          `❌ [${workerId}] Failed to send email to ${to}:`,
          error.message,
        );
        throw error;
      }
    },
  );

  console.log(
    `👷 Email worker registered for queue "${QUEUE_NAME}" (teamSize: 3)`,
  );

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
