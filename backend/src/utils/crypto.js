import bcrypt from 'bcrypt';
import AUTH_CONFIG from '../config/auth.js';

const BCRYPT_SALT_ROUNDS = AUTH_CONFIG.BCRYPT_SALT_ROUNDS;

/**
 * Hashes a plaintext password using bcrypt.
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

/**
 * Compares a plaintext password with a hashed password.
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

export {
  hashPassword,
  comparePassword,
};