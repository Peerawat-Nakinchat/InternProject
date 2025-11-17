import { UserModel } from '../models/UserModel.js';
import { MemberModel } from '../models/MemberModel.js';
import { hashPassword, comparePassword } from '../config/auth.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

const REFRESH_EXPIRES = process.env.REFRESH_EXPIRES || '7d';

export const AuthController = {
  async register(req, res) {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'email and password required' });
      const existing = await UserModel.findByEmail(email);
      if (existing) return res.status(400).json({ error: 'Email already registered' });

      const hashed = await hashPassword(password);
      const user = await UserModel.create(email, hashed, name);
      return res.status(201).json({ user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await UserModel.findByEmail(email);
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });

      const ok = await comparePassword(password, user.password);
      if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

      const companies = await MemberModel.getUserCompanies(user.id);

      const accessToken = generateAccessToken({ user_id: user.id });
      const refreshToken = generateRefreshToken({ user_id: user.id, jti: uuidv4() });

      // store refresh token with expiry (simple: uses jwt expiry)
      const decoded = JSON.parse(JSON.stringify({})); // placeholder
      const expiresAt = new Date(Date.now() + 7*24*60*60*1000);
      await MemberModel.saveRefreshToken(user.id, refreshToken, expiresAt);

      return res.json({
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
        refreshToken,
        companies
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

      const saved = await MemberModel.findRefreshToken(refreshToken);
      if (!saved) return res.status(401).json({ error: 'Invalid refresh token' });

      // verify JWT
      const payload = verifyRefreshToken(refreshToken);
      const accessToken = generateAccessToken({ user_id: payload.user_id });
      return res.json({ accessToken });
    } catch (err) {
      console.error(err);
      res.status(401).json({ error: 'Invalid token' });
    }
  },

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) await MemberModel.revokeRefreshToken(refreshToken);
      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
};
