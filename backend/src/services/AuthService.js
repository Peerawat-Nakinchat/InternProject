import { UserModel } from '../models/UserModel.js';
import { TokenModel } from '../models/TokenModel.js';
import { hashPassword, comparePassword } from '../utils/crypto.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.js';

/**
 * Registers a new user.
 */
const register = async ({ email, password, name, surname }) => {
  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    const err = new Error('User with this email already exists.');
    err.code = 'USER_EXISTS';
    throw err;
  }
  const passwordHash = await hashPassword(password);
  const newUser = await UserModel.createUser({
    email,
    passwordHash,
    name,
    surname
  });
  return newUser;
};

/**
 * Logs in a user.
 */
const login = async (email, password) => {
  const user = await UserModel.findByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  // ✅ FIX 1: เพิ่มการตรวจสอบ is_active
  if (!user.is_active) {
    throw new Error('Account is deactivated');
  }

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) throw new Error('Invalid email or password.');

  const payload = {
    user_id: user.user_id,
    email: user.email,
    role_id: user.role_id
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ user_id: user.user_id, role_id: user.role_id });

  await TokenModel.saveRefreshToken(user.user_id, refreshToken);

  const safeUser = {
    user_id: user.user_id,
    email: user.email,
    full_name: user.full_name,
    role_id: user.role_id
  };

  return { accessToken, refreshToken, user: safeUser };
};

const logout = async (refreshToken) => {
  await TokenModel.deleteRefreshToken(refreshToken);
};

const logoutAll = async (userId) => {
  await TokenModel.deleteAllTokensForUser(userId);
};

export {
  register,
  login,
  logout,
  logoutAll
};