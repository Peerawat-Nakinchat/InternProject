// src/services/InvitationService.js
import jwt from "jsonwebtoken";
import { MemberModel } from "../models/MemberModel.js";
import { UserModel } from "../models/UserModel.js";
import { OrganizationModel } from "../models/CompanyModel.js";
import { InvitationModel } from "../models/InvitationModel.js";
import { sendEmail } from "../utils/mailer.js";
import { sequelize } from "../models/dbModels.js";

const INVITE_SECRET = process.env.REFRESH_TOKEN_SECRET || "invite-secret-key";

class InvitationService {
  generateInviteToken(payload) {
    return jwt.sign(payload, INVITE_SECRET, { expiresIn: "2d" });
  }

  verifyInviteToken(token) {
    try {
      return jwt.verify(token, INVITE_SECRET);
    } catch {
      return null;
    }
  }

  /**
   * ส่งคำเชิญเข้าองค์กร
   */
  async sendInvitation(email, org_id, role_id, invited_by) {
    if (!email || !org_id || !role_id || !invited_by) {
      throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน");
    }

    // ตรวจสอบข้อมูลก่อนเริ่ม transaction
    const existingUser = await UserModel.findByEmail(email);

    if (existingUser) {
      const isAlreadyMember = await MemberModel.exists(
        org_id,
        existingUser.user_id
      );

      if (isAlreadyMember) {
        throw new Error("ผู้ใช้คนนี้เป็นสมาชิกบริษัทของท่านอยู่แล้ว");
      }

      // If inviting as employee (not owner), check if they're employee elsewhere
      if (parseInt(role_id) !== 1) {
        const memberships = await MemberModel.findByUser(
          existingUser.user_id
        );

        const isEmployeeElsewhere = memberships.some(
          (m) => m.org_id !== org_id && m.role_id !== 1
        );

        if (isEmployeeElsewhere) {
          throw new Error("ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น");
        }
      }
    }

    // เริ่ม transaction หลังจากตรวจสอบข้อมูลเบื้องต้นแล้ว
    const t = await sequelize.transaction();

    try {
      // ตรวจสอบว่ามี invitation ที่ pending อยู่แล้วหรือไม่
      const existingInvitations = await InvitationModel.findByEmail(email, org_id);
      
      // ยกเลิก invitation เก่าที่ pending
      for (const inv of existingInvitations) {
        await InvitationModel.updateStatus(inv.invitation_id, 'cancelled', t);
      }

      // สร้าง token
      const token = this.generateInviteToken({ 
        email, 
        org_id, 
        role_id,
        timestamp: Date.now() 
      });

      // บันทึก invitation ลง database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 2); // หมดอายุใน 2 วัน

      const invitation = await InvitationModel.create({
        email,
        org_id,
        role_id,
        token,
        invited_by,
        expires_at: expiresAt,
        status: 'pending'
      }, t);

      // Get company info
      const company = await OrganizationModel.findById(org_id);
      const companyName = company ? company.org_name : "บริษัทของเรา";

      // Build invite link
      const frontendUrl = (
        process.env.FRONTEND_URL || "http://localhost:5173"
      ).replace(/\/$/, "");
      const inviteLink = `${frontendUrl}/accept-invite?token=${token}`;

      // Send email
      const html = `
        <h1>คุณได้รับคำเชิญเข้าร่วมบริษัท ${companyName}</h1>
        <p>กรุณาคลิกที่ลิงก์ด้านล่างเพื่อตอบรับคำเชิญ:</p>
        <a href="${inviteLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">ตอบรับคำเชิญ</a>
        <p style="margin-top: 20px; color: #666;">คำเชิญนี้จะหมดอายุในวันที่ ${expiresAt.toLocaleDateString('th-TH')}</p>
      `;

      await sendEmail(email, `คำเชิญเข้าร่วมบริษัท ${companyName}`, html);

      // Commit transaction
      await t.commit();

      return {
        success: true,
        message: "Invitation sent successfully",
        invitation_id: invitation.invitation_id
      };
    } catch (error) {
      // Rollback เฉพาะเมื่อ transaction ยังไม่ถูก commit หรือ rollback
      if (!t.finished) {
        await t.rollback();
      }
      throw error;
    }
  }

  /**
   * ดึงข้อมูลคำเชิญ
   */
  async getInvitationInfo(token) {
    // ค้นหาจาก database
    const invitation = await InvitationModel.findByToken(token);

    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    // ตรวจสอบสถานะ
    if (invitation.status !== 'pending') {
      throw new Error(`Invitation has been ${invitation.status}`);
    }

    // ตรวจสอบว่าหมดอายุหรือไม่
    if (new Date() > new Date(invitation.expires_at)) {
      await InvitationModel.updateStatus(invitation.invitation_id, 'expired');
      throw new Error("Invitation has expired");
    }

    // ตรวจสอบ JWT token (เพิ่มความปลอดภัย)
    const payload = this.verifyInviteToken(token);
    if (!payload) {
      throw new Error("Invalid invitation token signature");
    }

    const existingUser = await UserModel.findByEmail(invitation.email);
    const org = await OrganizationModel.findById(invitation.org_id);

    let isAlreadyMember = false;
    if (existingUser) {
      isAlreadyMember = await MemberModel.exists(
        invitation.org_id,
        existingUser.user_id
      );
    }

    return {
      invitation_id: invitation.invitation_id,
      email: invitation.email,
      org_id: invitation.org_id,
      role_id: invitation.role_id,
      org_name: org ? org.org_name : "Unknown Company",
      status: invitation.status,
      expires_at: invitation.expires_at,
      isExistingUser: !!existingUser,
      isAlreadyMember,
    };
  }

  /**
   * รับคำเชิญ
   */
  async acceptInvitation(token, userId) {
    const invitation = await InvitationModel.findByToken(token);

    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    if (invitation.status !== 'pending') {
      throw new Error(`Invitation has been ${invitation.status}`);
    }

    if (new Date() > new Date(invitation.expires_at)) {
      await InvitationModel.updateStatus(invitation.invitation_id, 'expired');
      throw new Error("Invitation has expired");
    }

    const payload = this.verifyInviteToken(token);
    if (!payload) {
      throw new Error("Invalid invitation token signature");
    }

    const t = await sequelize.transaction();

    try {
      // Check if inviting as employee (not owner)
      if (parseInt(invitation.role_id) !== 1) {
        const memberships = await MemberModel.findByUser(userId);

        const isEmployeeElsewhere = memberships.some(
          (m) => m.org_id !== invitation.org_id && m.role_id !== 1
        );

        if (isEmployeeElsewhere) {
          throw new Error("ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น");
        }
      }

      // Add member to organization
      await MemberModel.create(
        {
          userId: userId,
          orgId: invitation.org_id,
          roleId: parseInt(invitation.role_id, 10),
        },
        t
      );

      // อัพเดทสถานะ invitation
      await InvitationModel.updateStatus(
        invitation.invitation_id, 
        'accepted', 
        t
      );

      await t.commit();

      return {
        success: true,
        message: "Invitation accepted successfully",
        org_id: invitation.org_id,
      };
    } catch (error) {
      if (!t.finished) {
        await t.rollback();
      }
      throw error;
    }
  }

  /**
   * ยกเลิกคำเชิญ
   */
  async cancelInvitation(token, requestingUserId) {
    const invitation = await InvitationModel.findByToken(token);

    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    if (invitation.status !== 'pending') {
      throw new Error(`Invitation has been ${invitation.status}`);
    }

    // ตรวจสอบสิทธิ์ (ต้องเป็นคนส่งคำเชิญ หรือ owner/admin ของ org)
    const isOwner = await OrganizationModel.isOwner(
      invitation.org_id, 
      requestingUserId
    );
    
    if (invitation.invited_by !== requestingUserId && !isOwner) {
      throw new Error("Unauthorized to cancel this invitation");
    }

    await InvitationModel.updateStatus(invitation.invitation_id, 'cancelled');

    return {
      success: true,
      message: "Invitation cancelled successfully",
    };
  }

  /**
   * Resend invitation
   */
  async resendInvitation(email, org_id, role_id, invited_by) {
    return await this.sendInvitation(email, org_id, role_id, invited_by);
  }

  /**
   * ดึงรายการคำเชิญทั้งหมดของ org
   */
  async getOrganizationInvitations(orgId) {
    return await InvitationModel.findPendingByOrg(orgId);
  }

  /**
   * ทำความสะอาด invitation ที่หมดอายุ (ควรรันเป็น cron job)
   */
  async cleanupExpiredInvitations() {
    return await InvitationModel.expireOldInvitations();
  }
}

export default new InvitationService();