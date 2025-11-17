import dotenv from 'dotenv';
import pkg from 'pg';

const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,      // ดึงค่าจาก .env
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ฟังก์ชันทดสอบการเชื่อมต่อ (เรียกครั้งเดียวตอน start server)
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected');
    client.release();
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
  }
}

testConnection();

// export pool ไปให้ไฟล์อื่นใช้งาน
export default pool;
