// src/services/InvitationService.js
import jwt from "jsonwebtoken";
import { MemberModel } from "../models/MemberModel.js";
import { UserModel } from "../models/UserModel.js";
import { OrganizationModel } from "../models/CompanyModel.js";
import { sendEmail } from "../utils/mailer.js";
import { sequelize } from "../models/dbModels.js";

const INVITE_SECRET = process.env.REFRESH_TOKEN_SECRET || "invite-secret-key";

class InvitationService {
  generateInviteToken(payload) {
    return jwt.sign(payload, INVITE_SECRET, { expiresIn: "7d" });
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
  async sendInvitation(email, org_id, role_id) {
    
    if (!email || !org_id || !role_id) {
      throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน");
    }

    const token = this.generateInviteToken({ email, org_id, role_id });

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
    `;

    await sendEmail(email, `คำเชิญเข้าร่วมบริษัท ${companyName}`, html);

    return {
      success: true,
      message: "Invitation sent successfully",
    };
  }

  /**
   * ดึงข้อมูลคำเชิญ
   */
  async getInvitationInfo(token) {
    const payload = this.verifyInviteToken(token);

    if (!payload) {
      throw new Error("Invalid or expired invitation token");
    }

    // Check if user exists
    const existingUser = await UserModel.findByEmail(payload.email);

    // Get organization info
    const org = await OrganizationModel.findById(payload.org_id);

    let isAlreadyMember = false;

    if (existingUser) {
      isAlreadyMember = await MemberModel.exists(
        payload.org_id,
        existingUser.user_id
      );
    }

    return {
      email: payload.email,
      org_id: payload.org_id,
      role_id: payload.role_id,
      org_name: org ? org.org_name : "Unknown Company",
      isExistingUser: !!existingUser,
      isAlreadyMember,
    };
  }

  /**
   * รับคำเชิญ
   */
  async acceptInvitation(token, userId) {
    const payload = this.verifyInviteToken(token);

    if (!payload) {
      throw new Error("Invalid or expired invitation token");
    }

    const t = await sequelize.transaction();

    try {
      // Check if inviting as employee (not owner)
      if (parseInt(payload.role_id) !== 1) {
        const memberships = await MemberModel.findByUser(userId);

        const isEmployeeElsewhere = memberships.some(
          (m) => m.org_id !== payload.org_id && m.role_id !== 1
        );

        if (isEmployeeElsewhere) {
          await t.rollback();
          throw new Error("ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น");
        }
      }

      // Add member to organization
      await MemberModel.create(
        {
          userId: userId,
          orgId: payload.org_id,
          roleId: parseInt(payload.role_id, 10),
        },
        { transaction: t }
      );

      await t.commit();

      return {
        success: true,
        message: "Invitation accepted successfully",
        org_id: payload.org_id,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Cancel invitation (revoke token)
   * Note: Since we're using JWT, we can't truly revoke it without a blacklist
   * This is a placeholder for future implementation with token blacklist
   */
  async cancelInvitation(token, requestingUserId) {
    // TODO: Implement token blacklist if needed
    // For now, tokens will expire naturally after 7 days
    return {
      success: true,
      message: "Invitation will expire automatically after 7 days",
    };
  }

  /**
   * Resend invitation
   */
  async resendInvitation(email, org_id, role_id) {
    // Simply create and send a new invitation
    return await this.sendInvitation(email, org_id, role_id);
  }
}

export default new InvitationService();