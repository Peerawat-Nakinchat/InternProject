// src/services/MfaService.js
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import AppError from '../utils/AppErrors.js';
import UserModel from '../models/UserModel.js';

// Setup Authenticator
authenticator.options = {
  window: 1, 
  step: 30
};

/**
 * Generate MFA Secret and QR Code
 * @param {string} userId 
 * @param {string} email 
 */
const generateMfaSecret = async (userId, email) => {
  const secret = authenticator.generateSecret();
  const serviceName = process.env.APP_NAME || 'MySecureApp';
  const otpauth = authenticator.keyuri(email, serviceName, secret);
  const qrCodeUrl = await QRCode.toDataURL(otpauth);
  await UserModel.saveMfaSecret(userId, secret);

  return { secret, qrCodeUrl };
};

/**
 * Verify OTP and Enable MFA
 * @param {string} userId 
 * @param {string} token 
 */
const verifyAndEnableMfa = async (userId, token) => {
  const user = await UserModel.findByIdWithSecret(userId);
  if (!user || !user.mfa_secret) {
    throw new AppError('MFA setup not initiated', 400);
  }

  const isValid = authenticator.verify({
    token,
    secret: user.mfa_secret
  });

  if (!isValid) {
    throw new AppError('Invalid OTP Code', 400);
  }

  await UserModel.enableMfa(userId);
  return true;
};

/**
 * Verify OTP for Login
 * @param {object} user 
 * @param {string} token 
 */
const verifyLoginMfa = (user, token) => {
  if (!user.mfa_enabled || !user.mfa_secret) {
    return true; 
  }

  return authenticator.verify({
    token,
    secret: user.mfa_secret
  });
};

export default {
  generateMfaSecret,
  verifyAndEnableMfa,
  verifyLoginMfa
};