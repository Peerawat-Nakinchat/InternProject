// src/services/InvitationService.js
import jwt from "jsonwebtoken";
import { MemberModel } from "../models/MemberModel.js";
import { UserModel } from "../models/UserModel.js";
import { OrganizationModel } from "../models/CompanyModel.js";
import { InvitationModel } from "../models/InvitationModel.js";
import { sendEmail } from "../utils/mailer.js";
import { sequelize } from "../models/dbModels.js";
import { createError } from "../middleware/errorHandler.js"; // ✅ Import Helper

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

  const generateInviteToken = (payload) => jwtLib.sign(payload, INVITE_SECRET, { expiresIn: "2d" });
  const verifyInviteToken = (token) => {
    try { return jwtLib.verify(token, INVITE_SECRET); } catch { return null; }
  };

  const sendInvitation = async (email, org_id, role_id, invited_by) => {
    if (!email || !org_id || !role_id || !invited_by) throw createError.badRequest("กรุณากรอกข้อมูลให้ครบถ้วน");

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      const isAlreadyMember = await Member.exists(org_id, existingUser.user_id);
      if (isAlreadyMember) throw createError.conflict("ผู้ใช้คนนี้เป็นสมาชิกบริษัทของท่านอยู่แล้ว"); // ✅ 409

      if (parseInt(role_id) !== 1) {
        const memberships = await Member.findByUser(existingUser.user_id);
        const isEmployeeElsewhere = memberships.some(m => m.org_id !== org_id && m.role_id !== 1);
        if (isEmployeeElsewhere) throw createError.conflict("ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น"); // ✅ 409
      }
    }

    const t = await db.transaction();
    try {
      const existingInvitations = await Invitation.findByEmail(email, org_id);
      for (const inv of existingInvitations) await Invitation.updateStatus(inv.invitation_id, 'cancelled', t);

      const token = generateInviteToken({ email, org_id, role_id, timestamp: Date.now() });
      const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 2);

      const invitation = await Invitation.create({
        email, org_id, role_id, token, invited_by, expires_at: expiresAt, status: 'pending'
      }, t);

      // ข้อมูลบริษัท
      const company = await Org.findById(org_id);
      const companyName = company ? company.org_name : "บริษัทของเรา";

      // ข้อมูลผู้เชิญ (ใช้สำหรับรูปโปรไฟล์ในอีเมล)
      const inviter = await User.findById(invited_by);
      let inviterName = "";
      if (inviter) {
        if (inviter.full_name) {
          inviterName = inviter.full_name;
        } else {
          const namePart = inviter.name || "";
          const surnamePart = inviter.surname || "";
          inviterName = `${namePart} ${surnamePart}`.trim();
        }
      } else {
        inviterName = "";
      }
      const inviterImageUrl = inviter && inviter.profile_image_url ? inviter.profile_image_url : null;

      let inviterImageHtml = "";
      if (inviterImageUrl) {
        inviterImageHtml = `
              <div style="text-align: center; margin-bottom: 16px;">
                <img src="${inviterImageUrl}" alt="${inviterName || 'ผู้เชิญ'}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; display:inline-block; border:3px solid #e2e8f0; box-shadow:0 4px 10px rgba(0,0,0,0.12);" />
              </div>
          `;
      } else {
        inviterImageHtml = "";
      }

      const frontendUrl = (env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
      const inviteLink = `${frontendUrl}/accept-invite?token=${token}`;

      const html = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>คำเชิญเข้าร่วมบริษัท</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                คำเชิญเข้าร่วมบริษัท
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">

              <h2 style="margin: 0 0 20px; color: #1a202c; font-size: 22px; font-weight: 600; text-align: center;">
                คุณได้รับคำเชิญจาก
              </h2>
              ${inviterImageHtml}
              <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 30px; border-radius: 6px;">
                <p style="margin: 0; color: #2d3748; font-size: 20px; font-weight: 600; text-align: center;">
                  ${companyName}
                </p>
              </div>

              <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
                ยินดีต้อนรับ! คุณได้รับเชิญให้เข้าร่วมเป็นสมาชิกของบริษัท <strong>${companyName}</strong><br>
                กรุณาคลิกปุ่มด้านล่างเพื่อตอบรับคำเชิญและเริ่มต้นการทำงานร่วมกับเรา
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
                  ✓ ตอบรับคำเชิญ
                </a>
              </div>

              <div style="margin: 30px 0; border-top: 1px solid #e2e8f0; padding-top: 25px;">
                <p style="margin: 0 0 15px; color: #718096; font-size: 14px; line-height: 1.6;">
                  หรือคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:
                </p>
                <div style="background-color: #f7fafc; padding: 12px; border-radius: 6px; word-break: break-all;">
                  <a href="${inviteLink}" style="color: #667eea; text-decoration: none; font-size: 13px;">
                    ${inviteLink}
                  </a>
                </div>
              </div>

              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 25px; border-radius: 6px;">
                <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                  ⚠️ <strong>หมายเหตุ:</strong> ลิงก์นี้จะหมดอายุใน 2 วัน หากคุณไม่ได้รับเชิญนี้ กรุณาเพิกเฉยอีเมลนี้
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px; color: #718096; font-size: 14px;">
                © ${new Date().getFullYear()} ${companyName}. สงวนลิขสิทธิ์
              </p>
              <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                อีเมลนี้ส่งถึง ${email}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      await mailer(email, `คำเชิญเข้าร่วมบริษัท ${companyName}`, html);
      await t.commit();
      return { success: true, message: "Invitation sent successfully", invitation_id: invitation.invitation_id };
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  };

  const getInvitationInfo = async (token) => {
    const invitation = await Invitation.findByToken(token);
    if (!invitation) throw createError.notFound("Invalid invitation token"); // ✅ 404
    if (invitation.status !== 'pending') throw createError.badRequest(`Invitation has been ${invitation.status}`); // ✅ 400

    if (new Date() > new Date(invitation.expires_at)) {
      await Invitation.updateStatus(invitation.invitation_id, 'expired');
      throw createError.badRequest("Invitation has expired"); // ✅ 400
    }

    const payload = verifyInviteToken(token);
    if (!payload) throw createError.badRequest("Invalid invitation token signature");

    const existingUser = await User.findByEmail(invitation.email);
    const org = await Org.findById(invitation.org_id);
    let isAlreadyMember = false;
    if (existingUser) isAlreadyMember = await Member.exists(invitation.org_id, existingUser.user_id);

    return {
      invitation_id: invitation.invitation_id, email: invitation.email,
      org_id: invitation.org_id, role_id: invitation.role_id,
      org_name: org ? org.org_name : "Unknown Company",
      status: invitation.status, expires_at: invitation.expires_at,
      isExistingUser: !!existingUser, isAlreadyMember,
    };
  };

  const acceptInvitation = async (token, userId) => {
    const invitation = await Invitation.findByToken(token);
    if (!invitation) throw createError.notFound("Invalid invitation token");
    if (invitation.status !== 'pending') throw createError.badRequest(`Invitation has been ${invitation.status}`);

    if (new Date() > new Date(invitation.expires_at)) {
      await Invitation.updateStatus(invitation.invitation_id, 'expired');
      throw createError.badRequest("Invitation has expired");
    }

    if (!verifyInviteToken(token)) throw createError.badRequest("Invalid token signature");

    const t = await db.transaction();
    try {
      if (parseInt(invitation.role_id) !== 1) {
        const memberships = await Member.findByUser(userId);
        const isEmployeeElsewhere = memberships.some(m => m.org_id !== invitation.org_id && m.role_id !== 1);
        if (isEmployeeElsewhere) throw createError.conflict("ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น"); // ✅ 409
      }

      await Member.create({ userId: userId, orgId: invitation.org_id, roleId: parseInt(invitation.role_id, 10) }, t);
      await Invitation.updateStatus(invitation.invitation_id, 'accepted', t);
      await t.commit();
      return { success: true, message: "Invitation accepted successfully", org_id: invitation.org_id };
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  };

  const cancelInvitation = async (token, requestingUserId) => {
    const invitation = await Invitation.findByToken(token);
    if (!invitation) throw createError.notFound("Invalid invitation token");
    if (invitation.status !== 'pending') throw createError.badRequest(`Invitation has been ${invitation.status}`);

    const isOwner = await Org.isOwner(invitation.org_id, requestingUserId);
    if (invitation.invited_by !== requestingUserId && !isOwner) {
      throw createError.forbidden("Unauthorized to cancel this invitation"); // ✅ 403
    }

    await Invitation.updateStatus(invitation.invitation_id, 'cancelled');
    return { success: true, message: "Invitation cancelled successfully" };
  };

  return { generateInviteToken, verifyInviteToken, sendInvitation, getInvitationInfo, acceptInvitation, cancelInvitation, resendInvitation: sendInvitation, getOrganizationInvitations: Invitation.findPendingByOrg, cleanupExpiredInvitations: Invitation.expireOldInvitations };
};

const defaultInstance = createInvitationService();
export default defaultInstance;
