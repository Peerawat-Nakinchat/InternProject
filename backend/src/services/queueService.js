// src/services/queueService.js
import PgBoss from 'pg-boss';
import { sendEmail } from '../utils/mailer.js'; 

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
        console.warn("⚠️ Warning: DB_PASSWORD is missing for Queue System. Connection might fail.");
    }

    // 2. สร้าง Instance ของ PgBoss
    boss = new PgBoss(bossConfig);
    
    boss.on('error', (error) => console.error('❌ Queue System Error:', error));

    try {
        await boss.start();
        console.log(`✅ Queue System Started (pg-boss) connected to DB: ${bossConfig.database}`);
    } catch (err) {
        console.error("❌ Failed to connect Queue to Database. Check your .env variables.");
        throw err;
    }

    // ===============================================
    // 👷 REGISTER WORKERS (คนทำงาน)
    // ===============================================
    
    // Worker สำหรับงานส่งอีเมล
    await boss.work('send-email', async (job) => {
        const { to, subject, html } = job.data;
        
        console.log(`📨 Processing email job for: ${to}`);
        
        try {
            // เรียกใช้ Mailer ของจริง
            await sendEmail(to, subject, html);
            console.log(`✅ Email sent to ${to}`);
        } catch (error) {
            console.error(`❌ Failed to send email to ${to}:`, error.message);
            throw error; 
        }
    });
};

/**
 * ฟังก์ชันสำหรับฝากงานเข้าคิว (Controller/Service เรียกใช้ตัวนี้)
 * @param {object} data - { to, subject, html }
 */
export const addEmailJob = async (data) => {
    if (!boss) {
        throw new Error("Queue system not initialized! Call startQueueSystem() first.");
    }
    await boss.send('send-email', data, { retryLimit: 3, expireInSeconds: 300 });
};