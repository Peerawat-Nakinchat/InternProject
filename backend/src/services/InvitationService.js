// src/services/InvitationService.js
import jwt from "jsonwebtoken";
import { MemberModel } from "../models/MemberModel.js";
import { UserModel } from "../models/UserModel.js";
import { OrganizationModel } from "../models/CompanyModel.js";
import { InvitationModel } from "../models/InvitationModel.js";
import { sendEmail } from "../utils/mailer.js";
import { sequelize } from "../models/dbModels.js";

/**
 * Factory for InvitationService
 * @param {Object} deps - Dependencies injection
 */
export const createInvitationService = (deps = {}) => {
  const INVITE_SECRET = deps.INVITE_SECRET || process.env.REFRESH_TOKEN_SECRET || "invite-secret-key";
  
  const User = deps.UserModel || UserModel;
  const Member = deps.MemberModel || MemberModel;
  const Org = deps.OrganizationModel || OrganizationModel;
  const Invitation = deps.InvitationModel || InvitationModel;
  const db = deps.sequelize || sequelize;
  const mailer = deps.sendEmail || sendEmail;
  const jwtLib = deps.jwt || jwt;
  const env = deps.env || process.env;

  // --- Helpers ---

  const generateInviteToken = (payload) => {
    return jwtLib.sign(payload, INVITE_SECRET, { expiresIn: "2d" });
  };

  const verifyInviteToken = (token) => {
    try {
      return jwtLib.verify(token, INVITE_SECRET);
    } catch {
      return null;
    }
  };

  // --- Main Methods ---

  const sendInvitation = async (email, org_id, role_id, invited_by) => {
    if (!email || !org_id || !role_id || !invited_by) {
      throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน");
    }

    const existingUser = await User.findByEmail(email);

    if (existingUser) {
      const isAlreadyMember = await Member.exists(org_id, existingUser.user_id);
      if (isAlreadyMember) {
        throw new Error("ผู้ใช้คนนี้เป็นสมาชิกบริษัทของท่านอยู่แล้ว");
      }

      if (parseInt(role_id) !== 1) {
        const memberships = await Member.findByUser(existingUser.user_id);
        const isEmployeeElsewhere = memberships.some(
          (m) => m.org_id !== org_id && m.role_id !== 1
        );
        if (isEmployeeElsewhere) {
          throw new Error("ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น");
        }
      }
    }

    const t = await db.transaction();

    try {
      const existingInvitations = await Invitation.findByEmail(email, org_id);
      for (const inv of existingInvitations) {
        await Invitation.updateStatus(inv.invitation_id, 'cancelled', t);
      }

      const token = generateInviteToken({ 
        email, org_id, role_id, timestamp: Date.now() 
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 2);

      const invitation = await Invitation.create({
        email, org_id, role_id, token, invited_by,
        expires_at: expiresAt, status: 'pending'
      }, t);

      const company = await Org.findById(org_id);
      const companyName = company ? company.org_name : "บริษัทของเรา";

      const frontendUrl = (env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
      const inviteLink = `${frontendUrl}/accept-invite?token=${token}`;

      const html = `
        <h1>คุณได้รับคำเชิญเข้าร่วมบริษัท ${companyName}</h1>
        <p>กรุณาคลิกที่ลิงก์ด้านล่างเพื่อตอบรับคำเชิญ:</p>
        <a href="${inviteLink}" style="...">ตอบรับคำเชิญ</a>
        <p>คำเชิญนี้จะหมดอายุในวันที่ ${expiresAt.toLocaleDateString('th-TH')}</p>
      `;

      await mailer(email, `คำเชิญเข้าร่วมบริษัท ${companyName}`, html);
      await t.commit();

      return {
        success: true,
        message: "Invitation sent successfully",
        invitation_id: invitation.invitation_id
      };
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  };

  const getInvitationInfo = async (token) => {
    const invitation = await Invitation.findByToken(token);
    if (!invitation) throw new Error("Invalid invitation token");
    if (invitation.status !== 'pending') throw new Error(`Invitation has been ${invitation.status}`);

    if (new Date() > new Date(invitation.expires_at)) {
      await Invitation.updateStatus(invitation.invitation_id, 'expired');
      throw new Error("Invitation has expired");
    }

    const payload = verifyInviteToken(token);
    if (!payload) throw new Error("Invalid invitation token signature");

    const existingUser = await User.findByEmail(invitation.email);
    const org = await Org.findById(invitation.org_id);

    let isAlreadyMember = false;
    if (existingUser) {
      isAlreadyMember = await Member.exists(invitation.org_id, existingUser.user_id);
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
  };

  const acceptInvitation = async (token, userId) => {
    const invitation = await Invitation.findByToken(token);
    if (!invitation) throw new Error("Invalid invitation token");
    if (invitation.status !== 'pending') throw new Error(`Invitation has been ${invitation.status}`);

    if (new Date() > new Date(invitation.expires_at)) {
      await Invitation.updateStatus(invitation.invitation_id, 'expired');
      throw new Error("Invitation has expired");
    }

    if (!verifyInviteToken(token)) throw new Error("Invalid invitation token signature");

    const t = await db.transaction();

    try {
      if (parseInt(invitation.role_id) !== 1) {
        const memberships = await Member.findByUser(userId);
        const isEmployeeElsewhere = memberships.some(
          (m) => m.org_id !== invitation.org_id && m.role_id !== 1
        );
        if (isEmployeeElsewhere) {
          throw new Error("ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น");
        }
      }

      await Member.create({
        userId: userId,
        orgId: invitation.org_id,
        roleId: parseInt(invitation.role_id, 10),
      }, t);

      await Invitation.updateStatus(invitation.invitation_id, 'accepted', t);
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
    const invitation = await Invitation.findByToken(token);
    if (!invitation) throw new Error("Invalid invitation token");
    if (invitation.status !== 'pending') throw new Error(`Invitation has been ${invitation.status}`);

    const isOwner = await Org.isOwner(invitation.org_id, requestingUserId);
    if (invitation.invited_by !== requestingUserId && !isOwner) {
      throw new Error("Unauthorized to cancel this invitation");
    }

    await Invitation.updateStatus(invitation.invitation_id, 'cancelled');
    return { success: true, message: "Invitation cancelled successfully" };
  };

  const resendInvitation = async (email, org_id, role_id, invited_by) => {
    return await sendInvitation(email, org_id, role_id, invited_by);
  };

  const getOrganizationInvitations = async (orgId) => {
    return await Invitation.findPendingByOrg(orgId);
  };

  const cleanupExpiredInvitations = async () => {
    return await Invitation.expireOldInvitations();
  };

  return {
    generateInviteToken,
    verifyInviteToken,
    sendInvitation,
    getInvitationInfo,
    acceptInvitation,
    cancelInvitation,
    resendInvitation,
    getOrganizationInvitations,
    cleanupExpiredInvitations
  };
};

// Default Instance
const defaultInstance = createInvitationService();
export default defaultInstance;