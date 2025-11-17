import { UserModel } from '../models/UserModel.js';
import { MemberModel } from '../models/MemberModel.js';
import { comparePassword, hashPassword } from '../config/auth.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { v4 as uuidv4 } from 'uuid';

export const AuthService = {
  async register(email, password, name) {
    const hashed = await hashPassword(password);
    return await UserModel.create(email, hashed, name);
  },

  async login(email, password) {
    const user = await UserModel.findByEmail(email);
    if (!user) throw new Error('User not found');
    const ok = await comparePassword(password, user.password);
    if (!ok) throw new Error('Invalid password');

    const companies = await MemberModel.getUserCompanies(user.id);
    const accessToken = generateAccessToken({ user_id: user.id });
    const refreshToken = generateRefreshToken({ user_id: user.id, jti: uuidv4() });
    const expiresAt = new Date(Date.now() + 7*24*60*60*1000);
    await MemberModel.saveRefreshToken(user.id, refreshToken, expiresAt);
    return { user, companies, accessToken, refreshToken };
  },

  async refresh(refreshToken) {
    const payload = verifyRefreshToken(refreshToken);
    const accessToken = generateAccessToken({ user_id: payload.user_id });
    return { accessToken };
  }
};
