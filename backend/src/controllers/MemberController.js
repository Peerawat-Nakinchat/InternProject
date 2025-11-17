import { MemberModel } from '../models/MemberModel.js';
import { UserModel } from '../models/UserModel.js';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const MemberController = {
  async invite(req, res) {
    try {
      const inviterId = req.user.user_id;
      const { company_id, email, role } = req.body;

      // simple validation
      if (!company_id || !email || !role) return res.status(400).json({ error: 'company_id, email, role required' });

      // find or create user placeholder (no password)
      let user = await UserModel.findByEmail(email);
      if (!user) {
        // create a user with a random password — user should reset password
        const pw = uuidv4();
        user = await UserModel.create(email, pw, null);
      }

      // add member
      await MemberModel.addMember(company_id, user.id, role, inviterId);

      // send invite email (link)
      const token = uuidv4();
      const link = `${process.env.INVITE_URL_BASE}?company_id=${company_id}&email=${encodeURIComponent(email)}&token=${token}`;
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject: 'You are invited',
          text: `You are invited to join. Click: ${link}`
        });
      } catch (err) {
        console.warn('Mail send failed', err.message);
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  async list(req, res) {
    try {
      const companyId = req.user.company_id;
      const members = await MemberModel.listMembers(companyId);
      return res.json(members);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  async updateRole(req, res) {
    try {
      const companyId = req.user.company_id;
      const userId = req.body.user_id;
      const role = req.body.role;
      // only owner or admin can update (checked in route)
      const updated = await MemberModel.updateRole(companyId, userId, role);
      return res.json({ updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  async remove(req, res) {
    try {
      const companyId = req.user.company_id;
      const userId = req.params.user_id;
      const role = await MemberModel.getRole(companyId, userId);
      if (role === 'owner') return res.status(400).json({ error: 'Cannot remove owner' });
      await MemberModel.removeMember(companyId, userId);
      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
};
