
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { logger } from './logger.js';

const SALT_ROUNDS = 12;
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    logger.error('Password hashing failed:', error);
    throw new Error('Password hashing failed');
  }
};

/**
 * Compare a plain password with a hashed password
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    logger.error('Password comparison failed:', error);
    throw new Error('Password comparison failed');
  }
};

/**
 * Generate a secure OTP code
 */
export const generateOTP = () => {
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
};

/**
 * Generate OTP expiry time
 */
export const generateOTPExpiry = () => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiry;
};

/**
 * Generate a secure random token
 */
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a verification token for email/domain verification
 */
export const generateVerificationToken = () => {
  return generateSecureToken(48);
};

/**
 * Validate OTP format
 */
export const isValidOTPFormat = (otp) => {
  return /^\d{6}$/.test(otp);
};

/**
 * Check if OTP is expired
 */
export const isOTPExpired = (expiryTime) => {
  return new Date() > new Date(expiryTime);
};
