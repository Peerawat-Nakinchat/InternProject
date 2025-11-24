import jwt from "jsonwebtoken";
import { MemberModel } from "../models/MemberModel.js";
import { sendEmail } from "../utils/mailer.js";
import { UserModel } from "../models/UserModel.js";

// Use a separate secret for invitations or reuse REFRESH_TOKEN_SECRET for simplicity in this demo
// In production, better to have INVITATION_TOKEN_SECRET
const INVITE_SECRET = process.env.REFRESH_TOKEN_SECRET || "invite-secret-key";

const generateInviteToken = (payload) => {
  return jwt.sign(payload, INVITE_SECRET, { expiresIn: "7d" });
};

const verifyInviteToken = (token) => {
  try {
    return jwt.verify(token, INVITE_SECRET);
  } catch (error) {
    return null;
  }
};

export const sendInvitation = async (req, res) => {
  try {
    const { email, org_id, role_id } = req.body;
    // const inviterId = req.user.user_id;

    // Generate stateless token
    const token = generateInviteToken({ email, org_id, role_id });

    // Fetch company name
    const { CompanyModel } = await import("../models/CompanyModel.js");
    const company = await CompanyModel.findOrganizationById(org_id);
    const companyName = company ? company.org_name : "บริษัทของเรา";

    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;

    const html = `
      <h1>คุณได้รับคำเชิญเข้าร่วมบริษัท ${companyName}</h1>
      <p>คุณได้รับคำเชิญให้เข้าร่วมทำงานกับเราที่ <b>${companyName}</b></p>
      <p>กรุณาคลิกที่ลิงก์ด้านล่างเพื่อตอบรับคำเชิญ:</p>
      <a href="${inviteLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">ตอบรับคำเชิญ</a>
      <p>หากคุณไม่ได้เป็นผู้ร้องขอคำเชิญนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>
    `;

    await sendEmail(email, `คำเชิญเข้าร่วมบริษัท ${companyName}`, html);

    res.json({ message: "Invitation sent successfully" });
  } catch (error) {
    console.error("Send invitation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getInvitationInfo = async (req, res) => {
  try {
    const { token } = req.params;
    const payload = verifyInviteToken(token);

    if (!payload) {
      return res
        .status(400)
        .json({ message: "Invalid or expired invitation token" });
    }

    // Check if user exists
    const existingUser = await UserModel.findByEmail(payload.email);

    // We need org name for display.
    // Since we don't have it in token, we might need to query it.
    // Let's import CompanyModel to get org name.
    const { CompanyModel } = await import("../models/CompanyModel.js");
    const org = await CompanyModel.findOrganizationById(payload.org_id);

    res.json({
      email: payload.email,
      org_id: payload.org_id,
      role_id: payload.role_id,
      org_name: org ? org.org_name : "Unknown Company",
      isExistingUser: !!existingUser,
    });
  } catch (error) {
    console.error("Get invitation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const acceptInvitation = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.user_id; // User must be logged in

    const payload = verifyInviteToken(token);
    if (!payload) {
      return res
        .status(400)
        .json({ message: "Invalid or expired invitation token" });
    }

    // Add member
    await MemberModel.addMemberToOrganization(
      null, // client
      payload.org_id,
      userId,
      payload.role_id
    );

    res.json({
      message: "Invitation accepted successfully",
      org_id: payload.org_id,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    if (error.message === "ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น") {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};
