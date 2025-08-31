import express from 'express';
import passport from 'passport';
import { authController } from '../controllers/authController.js';
import { authRateLimit, otpRateLimit } from '../middleware/rateLimiter.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Rate limiting for auth routes
// const authLimiter = authRateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 10, // limit each IP to 10 requests per windowMs
//   message: 'Too many authentication attempts, please try again later.'
// });

// const otpLimiter = otpRateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 3, // limit each IP to 3 OTP requests per windowMs
//   message: 'Too many OTP requests, please try again later.'
// });

// Email/Password Authentication Routes
router.post('/register', authRateLimit, authController.register);
router.post('/verify-otp', otpRateLimit, authController.verifyOTP);
router.post('/resend-otp', otpRateLimit, authController.resendOTP);
router.post('/login', authRateLimit, authController.login);
router.post('/refresh', authRateLimit, authController.refreshToken);
router.post('/logout', authenticateToken, authController.logout);
router.post('/complete-google-registration', authController.completeGoogleRegistration);

// Google OAuth Routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  authController.googleCallback
);

// Protected Routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/change-password', authenticateToken, authController.changePassword);

// Password Reset Routes
router.post('/forgot-password', authRateLimit, authController.forgotPassword);
router.post('/reset-password', authRateLimit, authController.resetPassword);

export default router;
