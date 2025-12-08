// src/utils/emailGenerator.js
import fs from 'fs/promises';
import path from 'path';
import mjml2html from 'mjml';
import handlebars from 'handlebars';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateCache = {};

/**
 * อ่านไฟล์ MJML -> Compile เป็น HTML -> แทนค่าตัวแปร (Handlebars)
 * @param {string} templateName - ชื่อไฟล์ใน folder templates (ไม่ต้องใส่ .mjml)
 * @param {object} data - ข้อมูลที่จะเอาไปแทนค่าใน template
 */
export const renderEmail = async (templateName, data) => {
  try {
    // 1. เช็คว่ามีใน Cache หรือยัง (ถ้า Production mode ควรใช้วิธีนี้)
    // แต่ถ้า Dev mode อาจจะอยากให้โหลดใหม่ตลอดเวลาแก้ไฟล์
    let compiledTemplate = templateCache[templateName];

    if (!compiledTemplate || process.env.NODE_ENV === 'development') {
      
      // หา path ของไฟล์ templates (ถอยจาก utils 1 ชั้น เข้า templates)
      const templatePath = path.join(__dirname, '../templates', `${templateName}.mjml`);
      
      // อ่านไฟล์
      const mjmlContent = await fs.readFile(templatePath, 'utf-8');

      // Compile MJML -> HTML
      const { html, errors } = mjml2html(mjmlContent);
      
      if (errors && errors.length > 0) {
        console.error('MJML Errors:', errors);
        throw new Error('Failed to compile MJML template');
      }

      // Compile Handlebars (เตรียมรอรับ Data)
      compiledTemplate = handlebars.compile(html);
      
      // เก็บลง Cache
      templateCache[templateName] = compiledTemplate;
    }

    // 2. แทนค่าข้อมูลลงไปใน Template
    return compiledTemplate(data);

  } catch (error) {
    console.error(`Error rendering email template "${templateName}":`, error);
    throw error;
  }
};