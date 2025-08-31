import { prisma } from '../config/database.js';
import { hashPassword, comparePassword, generateOTP, generateOTPExpiry, isValidOTPFormat, isOTPExpired } from '../utils/crypto.js';
import { emailService } from '../services/emailService.js';
import { logger } from '../utils/logger.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'; // Import bcrypt for password hashing/comparison
import { config } from '../config/environment.js';
import { tenantService } from '../services/tenantService.js';


/**
 * Register user with email/password
 */
export const registerWithEmail = async (req, res) => {
  try {
    const { email, password, firstName, lastName, organizationName, role = 'USER', superAdminSecret } = req.body;

    // --- Logic for SUPERADMIN creation ---
    if (role === 'SUPERADMIN') {
      // 1. Secure this path with a secret key
      if (!superAdminSecret || superAdminSecret !== process.env.SUPER_ADMIN_SECRET) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or missing secret for superadmin creation.',
        });
      }

      // 2. Check if superadmin already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists',
        });
      }

      // 3. Find or create the single "Administration" tenant for all superadmins
      let adminTenant = await prisma.tenant.findUnique({
        where: { organizationName: 'Luco Administration' },
      });

      if (!adminTenant) {
        adminTenant = await prisma.tenant.create({
          data: {
            organizationName: 'Luco Administration',
            status: 'ACTIVE',
            subscriptionPlan: 'PREMIUM', // Or a suitable plan for admins
          },
        });
      }

      // 4. Create the superadmin user
      const hashedPassword = await hashPassword(password);
      const superAdmin = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'SUPERADMIN',
          isEmailVerified: true, // Superadmins are pre-verified
          tenantId: adminTenant.id,
        },
      });

      logger.info('SUPERADMIN created successfully', { userId: superAdmin.id, email });
      return res.status(201).json({
        success: true,
        message: 'Superadmin created successfully.',
        data: { userId: superAdmin.id },
      });
    }

    // --- Logic for regular USER creation (your existing logic) ---
    if (!email || !password || !firstName || !organizationName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, and organization name are required for user registration.',
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }
    const existingTenant = await prisma.tenant.findUnique({ where: { organizationName } });
    if (existingTenant) {
      return res.status(409).json({
        success: false,
        message: 'Organization name already taken',
      });
    }

    const hashedPassword = await hashPassword(password);
    const otpCode = generateOTP();
    const otpExpiresAt = generateOTPExpiry();

    const newTenant = await prisma.tenant.create({
      data: {
        organizationName,
        sesConfigurationSet: `luco-${organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        status: 'PENDING_VERIFICATION',
        subscriptionPlan: 'FREE',
        subscriptionStatus: 'ACTIVE',
        monthlyEmailLimit: 200,
        customTemplateLimit: 5,
        attachmentSizeLimit: 100,
        users: {
          create: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            otpCode,
            otpExpiresAt,
          },
        },
      },
      include: {
        users: true,
      },
    });

    const newUser = newTenant.users[0];

    tenantService.setupTenantSES(newUser.tenantId, newTenant.organizationName, newTenant.sesConfigurationSet)
      .catch(err => logger.error('Post-registration SES setup failed:', err));

    await emailService.sendOTPEmail(email, otpCode, organizationName);

    logger.info('User registered successfully', {
      userId: newUser.id,
      email,
      tenantId: newTenant.id,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for verification code.',
      data: {
        userId: newUser.id,
        email: newUser.email,
        requiresOTPVerification: true,
      },
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
};

/**
 * Verify OTP and complete registration
 */
export const verifyOTP = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP code are required',
      });
    }

    if (!isValidOTPFormat(otpCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP format',
      });
    }

    // Find user with pending verification
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified',
      });
    }

    if (!user.otpCode || user.otpCode !== otpCode) {
      // Increment OTP attempts
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpAttempts: {
            increment: 1,
          },
        },
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code',
      });
    }

    if (isOTPExpired(user.otpExpiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'OTP code has expired',
      });
    }

    // Check OTP attempts limit
    if (user.otpAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP attempts. Please request a new code.',
      });
    }

    // Update user and tenant status
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          otpCode: null,
          otpExpiresAt: null,
          otpAttempts: 0,
        },
      }),
      prisma.tenant.update({
        where: { id: user.tenantId },
        data: {
          status: 'ACTIVE',
        },
      }),
    ]);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Send welcome email
    await emailService.sendWelcomeEmail(
      user.email,
      user.firstName,
      user.tenant.organizationName
    );

    logger.info('OTP verification successful', {
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tenant: {
          id: user.tenant.id,
          organizationName: user.tenant.organizationName,
          status: 'ACTIVE',
        },
      },
    });
  } catch (error) {
    logger.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
    });
  }
};

/**
 * Resend OTP code
 */
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified',
      });
    }

    // Generate new OTP
    const otpCode = generateOTP();
    const otpExpiresAt = generateOTPExpiry();

    // Update user with new OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiresAt,
        otpAttempts: 0, // Reset attempts
      },
    });

    // Send OTP email
    await emailService.sendOTPEmail(email, otpCode, user.tenant.organizationName);

    logger.info('OTP resent successfully', { userId: user.id, email });

    res.json({
      success: true,
      message: 'New verification code sent to your email',
    });
  } catch (error) {
    logger.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code',
    });
  }
};

/**
 * Login with email/password
 */
export const loginWithEmail = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email first',
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check tenant status
    if (user.tenant.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended or pending verification',
      });
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profilePicture: user.profilePicture,
        },
        tenant: {
          id: user.tenant.id,
          organizationName: user.tenant.organizationName,
          status: user.tenant.status,
          subscriptionPlan: user.tenant.subscriptionPlan,
        },
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

/**
 * Complete Google OAuth registration with organization
 */
// export const completeGoogleRegistration = async (req, res) => {
//   try {
//     const { organizationName } = req.body;

//     if (!req.user || !req.user.isPending) {
//       return res.status(400).json({
//         success: false,
//         message: 'No pending Google registration found',
//       });
//     }

//     if (!organizationName) {
//       return res.status(400).json({
//         success: false,
//         message: 'Organization name is required',
//       });
//     }

//     const { pendingUser } = req.user;

//     // Check if organization name is already taken
//     const existingTenant = await prisma.tenant.findUnique({
//       where: { organizationName },
//     });

//     if (existingTenant) {
//       return res.status(409).json({
//         success: false,
//         message: 'Organization name already taken',
//       });
//     }

//     // Create tenant
//     const tenant = await prisma.tenant.create({
//       data: {
//         organizationName,
//         status: 'ACTIVE', // Auto-activate for Google OAuth users
//       },
//     });

//     // Create user
//     const user = await prisma.user.create({
//       data: {
//         email: pendingUser.email,
//         googleId: pendingUser.googleId,
//         firstName: pendingUser.firstName,
//         lastName: pendingUser.lastName,
//         profilePicture: pendingUser.profilePicture,
//         isEmailVerified: true, // Auto-verify for Google OAuth
//         tenantId: tenant.id,
//         lastLoginAt: new Date(),
//       },
//       include: { tenant: true },
//     });

//     // Generate tokens
//     const { accessToken, refreshToken } = generateTokens(user);

//     // Set cookies
//     setTokenCookies(res, accessToken, refreshToken);

//     // Send welcome email
//     await emailService.sendWelcomeEmail(
//       user.email,
//       user.firstName,
//       organizationName
//     );

//     logger.info('Google OAuth registration completed', {
//       userId: user.id,
//       email: user.email,
//       tenantId: tenant.id,
//     });

//     res.json({
//       success: true,
//       message: 'Registration completed successfully',
//       data: {
//         user: {
//           id: user.id,
//           email: user.email,
//           firstName: user.firstName,
//           lastName: user.lastName,
//           role: user.role,
//           profilePicture: user.profilePicture,
//         },
//         tenant: {
//           id: tenant.id,
//           organizationName: tenant.organizationName,
//           status: tenant.status,
//         },
//       },
//     });
//   } catch (error) {
//     logger.error('Google registration completion error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Registration completion failed',
//     });
//   }
// };

/**
 * Complete Google OAuth registration with organization
 */
export const completeGoogleRegistration = async (req, res) => {
  try {
    const { organizationName } = req.body;

    // Check for temporary Google token instead of req.user
    const tempToken = req.cookies.tempGoogleToken;
    if (!tempToken) {
      return res.status(400).json({
        success: false,
        message: 'No pending Google registration found. Please start the registration process again.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_ACCESS_SECRET);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired registration token. Please start the registration process again.',
      });
    }

    if (!decoded.isPending || !decoded.pendingUser) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration data. Please start the registration process again.',
      });
    }

    if (!organizationName || organizationName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required',
      });
    }

    const { pendingUser } = decoded;

    // Check if organization name is already taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { organizationName: organizationName.trim() },
    });

    if (existingTenant) {
      return res.status(409).json({
        success: false,
        message: 'Organization name already taken',
      });
    }

    // Check if user already exists (edge case)
    const existingUser = await prisma.user.findUnique({
      where: { email: pendingUser.email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create tenant and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          organizationName: organizationName.trim(),
          sesConfigurationSet: `luco-${organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
          status: 'ACTIVE', // Auto-activate for Google OAuth users
          subscriptionPlan: 'FREE',
          subscriptionStatus: 'ACTIVE',
          monthlyEmailLimit: 200,
          customTemplateLimit: 5,
          attachmentSizeLimit: 100,
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email: pendingUser.email,
          googleId: pendingUser.googleId,
          firstName: pendingUser.firstName,
          lastName: pendingUser.lastName,
          profilePicture: pendingUser.profilePicture,
          isEmailVerified: true, // Auto-verify for Google OAuth
          tenantId: tenant.id,
          lastLoginAt: new Date(),
        },
        include: { tenant: true },
      });

      return { user, tenant };
    });

    const { user, tenant } = result;

    // Clear temporary token
    res.clearCookie('tempGoogleToken');

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Setup tenant SES (async)
    tenantService.setupTenantSES(tenant.id, tenant.organizationName, tenant.sesConfigurationSet)
      .catch(err => logger.error('Post-registration SES setup failed:', err));

    // Send welcome email (async)
    emailService.sendWelcomeEmail(
      user.email,
      user.firstName,
      organizationName
    ).catch(err => logger.error('Welcome email failed:', err));

    logger.info('Google OAuth registration completed', {
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
    });

    res.json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profilePicture: user.profilePicture,
        },
        tenant: {
          id: tenant.id,
          organizationName: tenant.organizationName,
          status: tenant.status,
          subscriptionPlan: tenant.subscriptionPlan,
        },
      },
    });
  } catch (error) {
    logger.error('Google registration completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration completion failed',
    });
  }
};

/**
 * Logout user
 */
export const logout = (req, res) => {
  // Clear cookies
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  // Logout from Passport session if using Google OAuth
  req.logout((err) => {
    if (err) {
      logger.error('Logout error:', err);
    }
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * Get current user profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        tenant: {
          select: {
            id: true,
            organizationName: true,
            status: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
            monthlyEmailLimit: true,
            emailsSentThisMonth: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
          lastLoginAt: user.lastLoginAt,
        },
        tenant: user.tenant,
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, profilePicture } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        profilePicture
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true
      }
    });

    logger.info(`Profile updated for user: ${req.user.email}`);
    res.json({ user: updatedUser });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * Change password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || !user.password) {
      return res.status(400).json({ error: 'Password change not available for OAuth users' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    logger.info(`Password changed for user: ${user.email}`);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

/**
 * Forgot password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success to prevent email enumeration
    res.json({ message: 'If an account with that email exists, a password reset link has been sent' });

    if (!user || !user.password) {
      // Don't send email for non-existent users or OAuth users
      return;
    }

    // Generate reset token (reuse OTP logic)
    const resetToken = generateOTP();
    const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: resetToken,
        otpExpiresAt: resetExpiresAt,
        otpAttempts: 0
      }
    });

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, resetToken, user.firstName);

    logger.info(`Password reset requested for user: ${user.email}`);
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Email, reset token, and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.otpCode || user.otpCode !== resetToken) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0
      }
    });

    logger.info(`Password reset successful for user: ${user.email}`);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};


/**
 * Helper function to generate JWT tokens
 */
const generateTokens = (user) => {
  const payload = {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
};

/**
 * Helper function to set token cookies
 */
const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Refresh token endpoint
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { tenant: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

/**
 * Google OAuth callback handler
 */
export const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      logger.error('No user data in Google callback');
      return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=google_auth_failed`);
    }
    
    if (user.isPending) {
      // Store pending user data in a temporary token for the frontend
      const tempToken = jwt.sign(
        { pendingUser: user.pendingUser, isPending: true },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '10m' }
      );
      
      // Set temporary token as cookie
      res.cookie('tempGoogleToken', tempToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 10 * 60 * 1000, // 10 minutes
      });
      
      // Redirect to complete registration
      res.redirect(`${process.env.CLIENT_URL}/auth/complete-google-registration`);
    } else {
      // Generate tokens and redirect based on role
      const tokens = generateTokens(user);
      setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
      
      // Role-based redirect
      const redirectUrl = user.role === 'SUPERADMIN' 
        ? `${process.env.CLIENT_URL}/admin/dashboard`
        : `${process.env.CLIENT_URL}/dashboard`;
        
      res.redirect(redirectUrl);
    }
  } catch (error) {
    logger.error('Google callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=google_auth_failed`);
  }
};

/**
 * Update organization settings
 */
export const updateOrganizationSettings = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const updates = req.body;

    // Validate updates
    const allowedFields = ['organizationName', 'timezone', 'defaultFromEmail', 'defaultFromName'];
    const filteredUpdates = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    const updatedTenant = await tenantService.updateTenantSettings(tenantId, filteredUpdates);

    res.json({
      success: true,
      message: 'Organization settings updated successfully',
      data: { tenant: updatedTenant }
    });

  } catch (error) {
    logger.error('Update organization settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update organization settings'
    });
  }
};

// Export all functions as an object for consistent import pattern
export const authController = {
  register: registerWithEmail,
  verifyOTP,
  resendOTP,
  login: loginWithEmail,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  googleCallback,
  updateOrganizationSettings,
  completeGoogleRegistration
};