// src/services/InvitationService.js
import { MemberModel } from "../models/MemberModel.js";
import { UserModel } from "../models/UserModel.js";
import { OrganizationModel } from "../models/CompanyModel.js";
import { InvitationModel } from "../models/InvitationModel.js";
import { sequelize } from "../models/dbModels.js";
import { createError } from "../middleware/errorHandler.js";
import { generateSecureToken, hashToken } from "../utils/token.js";
import { renderEmail } from "../utils/emailGenerator.js";
import { addEmailJob } from "./queueService.js";
import { ROLE_ID } from "../constants/roles.js";
import AuditLogModel from "../models/AuditLogModel.js";
import { AUDIT_ACTIONS } from "../constants/AuditActions.js";
import logger from "../utils/logger.js";

export const createInvitationService = (deps = {}) => {
  const User = deps.UserModel || UserModel;
  const Member = deps.MemberModel || MemberModel;
  const Org = deps.OrganizationModel || OrganizationModel;
  const Invitation = deps.InvitationModel || InvitationModel;
  const AuditLog = deps.AuditLogModel || AuditLogModel;
  const db = deps.sequelize || sequelize;
  const env = deps.env || process.env;

  const sendInvitation = async (email, org_id, role_id, invited_by, clientInfo = {}) => {
    if (!email || !org_id || !role_id || !invited_by)
      throw createError.badRequest("กรุณากรอกข้อมูลให้ครบถ้วน");

    const inviterMember = await Member.findOne(org_id, invited_by);

    if (!inviterMember) {
      throw createError.forbidden("คุณไม่ได้เป็นสมาชิกขององค์กรนี้");
    }

    if (![ROLE_ID.OWNER, ROLE_ID.ADMIN].includes(inviterMember.role_id)) {
      throw createError.forbidden("คุณไม่มีสิทธิ์ส่งคำเชิญ (ต้องการสิทธิ์ Admin หรือ Owner)");
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      if (existingUser.user_id === invited_by) {
        throw createError.badRequest("คุณไม่สามารถเชิญอีเมลของตัวเองได้");
      }
      const isAlreadyMember = await Member.exists(org_id, existingUser.user_id);
      if (isAlreadyMember)
        throw createError.conflict("ผู้ใช้คนนี้เป็นสมาชิกบริษัทของท่านอยู่แล้ว");

      if (parseInt(role_id) !== 1) {
        const memberships = await Member.findByUser(existingUser.user_id);
        const isEmployeeElsewhere = memberships.some(
          (m) => m.org_id !== org_id && m.role_id !== 1,
        );
        if (isEmployeeElsewhere)
          throw createError.conflict("ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น");
      }
    }

    const t = await db.transaction();
    try {
      const existingInvitations = await Invitation.findByEmail(email, org_id);
      for (const inv of existingInvitations)
        await Invitation.updateStatus(inv.invitation_id, "cancelled", t);

      const { token, hashedToken } = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 2);

      const invitation = await Invitation.create(
        {
          email,
          org_id,
          role_id,
          token: hashedToken,
          invited_by,
          expires_at: expiresAt,
          status: "pending",
        },
        t,
      );

      const company = await Org.findById(org_id);
      const companyName = company ? company.org_name : "บริษัทของเรา";

      const inviter = await User.findById(invited_by);
      const inviterImageUrl =
        inviter && inviter.profile_image_url ? inviter.profile_image_url : null;

      const frontendUrl = (env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
      const inviteLink = `${frontendUrl}/accept-invite?token=${token}&email=${encodeURIComponent(email)}`;

      // สร้าง HTML จาก Template
      const html = await renderEmail("invitation", {
        companyName,
        inviterImageUrl,
        inviterMember, // 🔥 แก้ไข 1: เปลี่ยนจาก inviteMember เป็น inviterMember (แก้ Typo)
        inviteLink,
        email,
        year: new Date().getFullYear(),
      });

      try {
        await addEmailJob({
          to: email,
          subject: `คำเชิญเข้าร่วมบริษัท ${companyName}`,
          html: html,
        });
        logger.info(`✅ Invitation email queued successfully for: ${email}`);
      } catch (emailError) {
        if (!t.finished) await t.rollback();
        logger.error("❌ Failed to queue invitation email:", emailError.message);
        throw createError.internal("ไม่สามารถส่งอีเมลคำเชิญได้ กรุณาลองใหม่อีกครั้ง");
      }

      await t.commit();

      return {
        success: true,
        message: "Invitation sent successfully",
        invitation_id: invitation.invitation_id,
      };
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  };

  const getInvitationInfo = async (token) => {
    if (!token) throw createError.badRequest("Token is required");

    const hashedToken = hashToken(token);
    const invitation = await Invitation.findByToken(hashedToken);

    if (!invitation) throw createError.notFound("Invalid invitation token");
    if (invitation.status !== "pending")
      throw createError.badRequest(`Invitation has been ${invitation.status}`);

    if (new Date() > new Date(invitation.expires_at)) {
      await Invitation.updateStatus(invitation.invitation_id, "expired");
      throw createError.badRequest("Invitation has expired");
    }

    const existingUser = await User.findByEmail(invitation.email);
    const org = await Org.findById(invitation.org_id);
    let isAlreadyMember = false;
    if (existingUser)
      isAlreadyMember = await Member.exists(invitation.org_id, existingUser.user_id);

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
  };

  // 🔥 แก้ไข 2: เพิ่ม parameter clientInfo = {} เพื่อรับ IP/UserAgent
  const acceptInvitation = async (token, userId, clientInfo = {}) => {
    const hashedToken = hashToken(token);
    const invitation = await Invitation.findByToken(hashedToken);

    if (!invitation) throw createError.notFound("Invalid invitation token");
    if (invitation.status !== "pending")
      throw createError.badRequest(`Invitation has been ${invitation.status}`);

    if (new Date() > new Date(invitation.expires_at)) {
      await Invitation.updateStatus(invitation.invitation_id, "expired");
      throw createError.badRequest("Invitation has expired");
    }

    // ✅ NEW: Validate logged-in user email matches invitation email
    const loggedInUser = await User.findById(userId);
    if (!loggedInUser) {
      throw createError.unauthorized("ไม่พบข้อมูลผู้ใช้");
    }
    if (loggedInUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw createError.forbidden(
        `อีเมลที่ล็อคอินไม่ตรงกับอีเมลที่ได้รับเชิญ กรุณาออกจากระบบและเข้าสู่ระบบด้วยอีเมล ${invitation.email}`,
      );
    }

    const t = await db.transaction();
    try {
      if (parseInt(invitation.role_id) !== 1) {
        const memberships = await Member.findByUser(userId);
        const isEmployeeElsewhere = memberships.some(
          (m) => m.org_id !== invitation.org_id && m.role_id !== 1,
        );
        if (isEmployeeElsewhere)
          throw createError.conflict("ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น");
      }

      await Member.create(
        {
          userId: userId,
          orgId: invitation.org_id,
          roleId: parseInt(invitation.role_id, 10),
        },
        t,
      );
      await Invitation.updateStatus(invitation.invitation_id, "accepted", t);

      await AuditLog.create({
        action: AUDIT_ACTIONS.INVITATION?.ACCEPT || "INVITATION_ACCEPTED",
        user_id: userId,
        target_id: invitation.org_id,
        resource_type: "ORGANIZATION",
        details: {
          invitation_id: invitation.invitation_id,
          role_assigned: invitation.role_id,
          ip_address: clientInfo.ip || "unknown",
          user_agent: clientInfo.userAgent || "unknown"
        },
        status: "SUCCESS",
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent
      }, { transaction: t });

      await t.commit();
      return {
        success: true,
        message: "Invitation accepted successfully",
        org_id: invitation.org_id,
      };
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  };

  const cancelInvitation = async (token, requestingUserId) => {
    const hashedToken = hashToken(token);
    const invitation = await Invitation.findByToken(hashedToken);

    if (!invitation) throw createError.notFound("Invalid invitation token");
    if (invitation.status !== "pending")
      throw createError.badRequest(`Invitation has been ${invitation.status}`);

    const isOwner = await Org.isOwner(invitation.org_id, requestingUserId);
    if (invitation.invited_by !== requestingUserId && !isOwner) {
      throw createError.forbidden("Unauthorized to cancel this invitation");
    }

    await Invitation.updateStatus(invitation.invitation_id, "cancelled");
    return { success: true, message: "Invitation cancelled successfully" };
  };

  return {
    sendInvitation,
    getInvitationInfo,
    acceptInvitation,
    cancelInvitation,
    resendInvitation: sendInvitation,
    getOrganizationInvitations: Invitation.findPendingByOrg,
    cleanupExpiredInvitations: Invitation.expireOldInvitations,
  };
};

const defaultInstance = createInvitationService();
export default defaultInstance;