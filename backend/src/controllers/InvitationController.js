// src/controllers/InvitationController.js
import jwt from "jsonwebtoken";
import { MemberModel } from "../models/MemberModel.js";
import { UserModel } from "../models/UserModel.js";
import { OrganizationModel } from "../models/CompanyModel.js";
import { sendEmail } from "../utils/mailer.js";
import { sequelize } from "../models/dbModels.js";

const INVITE_SECRET = process.env.REFRESH_TOKEN_SECRET || "invite-secret-key";

const generateInviteToken = (payload) =>
  jwt.sign(payload, INVITE_SECRET, { expiresIn: "7d" });

const verifyInviteToken = (token) => {
  try {
    return jwt.verify(token, INVITE_SECRET);
  } catch {
    return null;
  }
};

// ส่งคำเชิญ
export const sendInvitation = async (req, res) => {
  try {
    const { email, org_id, role_id } = req.body;

    const token = generateInviteToken({ email, org_id, role_id });

    // 1. 🔍 ค้นหา User จาก Email ก่อน (เพื่อเอา user_id)
    const existingUser = await UserModel.findByEmail({ where: { email } });

    if (existingUser) {
        // 2. ✅ ถ้ามี User ให้ใช้ user_id ไปเช็ค (แก้เรื่อง UUID Error)
        const isAlreadyMember = await MemberModel.checkMembership(org_id, existingUser.user_id);
        if (isAlreadyMember) {
            return res.status(400).json({
                message: "ผู้ใช้คนนี้เป็นสมาชิกบริษัทของท่านอยู่แล้ว",
            });
        }

        // 3. ✅ เช็คว่าเป็นพนักงานที่อื่นไหม (ใช้ user_id เช่นกัน)
        if (parseInt(role_id) !== 1) {
            // แก้จาก findMembershipsByEmail เป็น findMembershipsByUserId
            const memberships = await MemberModel.findMembershipsByUserId(existingUser.user_id);
            const isEmployeeElsewhere = memberships.some(
                (m) => m.org_id !== org_id && m.role_id !== 1
            );
            if (isEmployeeElsewhere) {
                return res.status(400).json({
                    message: "ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น",
                });
            }
        }
    } 
    const company = await OrganizationModel.findOrganizationById(org_id);
    const companyName = company ? company.org_name : "บริษัทของเรา";

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    const inviteLink = `${frontendUrl}/accept-invite?token=${token}`;

    const html = `
      <h1>คุณได้รับคำเชิญเข้าร่วมบริษัท ${companyName}</h1>
      <p>กรุณาคลิกที่ลิงก์ด้านล่างเพื่อตอบรับคำเชิญ:</p>
      <a href="${inviteLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">ตอบรับคำเชิญ</a>
    `;

    await sendEmail(email, `คำเชิญเข้าร่วมบริษัท ${companyName}`, html);

    res.json({ message: "Invitation sent successfully" });
  } catch (error) {
    console.error("Send invitation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ดึงข้อมูลคำเชิญ
export const getInvitationInfo = async (req, res) => {
  try {
    const { token } = req.params;
    const payload = verifyInviteToken(token);

    if (!payload) {
      return res.status(400).json({ message: "Invalid or expired invitation token" });
    }

    const existingUser = await UserModel.findByEmail(payload.email);
    
    const org = await OrganizationModel.findOrganizationById(payload.org_id);
    
    let isAlreadyMember = false;

    if (existingUser) {
        isAlreadyMember = await MemberModel.checkMembership(payload.org_id, existingUser.user_id);
    } 


    res.json({
      email: payload.email,
      org_id: payload.org_id,
      role_id: payload.role_id,
      org_name: org ? org.org_name : "Unknown Company",
      isExistingUser: !!existingUser,
      isAlreadyMember, // ส่งผลลัพธ์ที่ถูกต้องกลับไป
    });
  } catch (error) {
    console.error("Get invitation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// รับคำเชิญ
export const acceptInvitation = async (req, res) => {
  // 1. ย้าย transaction มาสร้างหลัง verify token เพื่อลดภาระ DB
  
  try {
    const { token } = req.body;
    // เช็ค token ก่อน
    const payload = verifyInviteToken(token);
    
    if (!payload) {
      return res.status(400).json({ message: "Invalid or expired invitation token" });
    }

    const userId = req.user.user_id;

    // เริ่ม Transaction ตรงนี้
    const t = await sequelize.transaction(); 

    try {
      // เช็คว่าเป็นพนักงานที่อื่นไหม
      if (parseInt(payload.role_id) !== 1) {
        const memberships = await MemberModel.findMembershipsByUserId(userId);
        const isEmployeeElsewhere = memberships.some(
          (m) => m.org_id !== payload.org_id && m.role_id !== 1
        );
        if (isEmployeeElsewhere) {
          await t.rollback(); // อย่าลืม rollback
          return res.status(400).json({ message: "ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น" });
        }
      }

      // ✅ แก้จุดนี้: ส่งค่าเป็น Object ให้ตรงกับ Model
      await MemberModel.addMemberToOrganization(
        {
          userId: userId,
          orgId: payload.org_id,
          roleId: parseInt(payload.role_id, 10),
        }, 
        { transaction: t } // ส่ง transaction เป็น argument ที่ 2
      );

      await t.commit();

      res.json({ message: "Invitation accepted successfully", org_id: payload.org_id });
      
    } catch (innerError) {
      await t.rollback();
      throw innerError; // โยน error ไปให้ catch ด้านล่างจัดการ
    }

  } catch (error) {
    console.error("Accept invitation error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};