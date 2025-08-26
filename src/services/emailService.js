import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  async initialize() {
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass, // App password for Gmail
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Verify connection
      await this.transporter.verify();
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Email service initialization failed:', error);
      throw new Error('Failed to initialize email service');
    }
  }

  /**
   * Send OTP verification email
   */
  async sendOTPEmail(email, otp, organizationName) {
    try {
      const mailOptions = {
        from: {
          name: 'Luco Platform',
          address: config.smtp.user,
        },
        to: email,
        subject: 'Verify Your Email - Luco Platform',
        html: this.generateOTPEmailTemplate(otp, organizationName),
        text: `Your verification code is: ${otp}. This code expires in 10 minutes.`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('OTP email sent successfully', {
        email,
        messageId: result.messageId,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      logger.error('Failed to send OTP email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(email, firstName, organizationName) {
    try {
      const mailOptions = {
        from: {
          name: 'Luco Platform',
          address: config.smtp.user,
        },
        to: email,
        subject: 'Welcome to Luco Platform!',
        html: this.generateWelcomeEmailTemplate(firstName, organizationName),
        text: `Welcome to Luco Platform, ${firstName}! Your organization "${organizationName}" has been successfully registered.`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Welcome email sent successfully', {
        email,
        messageId: result.messageId,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      // Don't throw error for welcome email failures
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, resetToken, firstName = '') {
    try {
      const mailOptions = {
        from: `"${config.smtp.user}" <${config.smtp.user}>`,
        to: email,
        subject: 'Reset Your Password - Luco',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; }
              .token { background-color: #e5e7eb; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; border-radius: 5px; margin: 20px 0; }
              .footer { color: #666; font-size: 14px; text-align: center; padding: 20px; }
              .warning { background-color: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Reset Your Password</h1>
              </div>
              <div class="content">
                <p>Hello ${firstName},</p>
                <p>You requested to reset your password for your Luco account. Use the following code to reset your password:</p>
                <div class="token">${resetToken}</div>
                <p>This code will expire in <strong>15 minutes</strong>.</p>
                <div class="warning">
                  <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email and consider changing your password if you suspect unauthorized access to your account.
                </div>
                <p>For your security, this code can only be used once.</p>
              </div>
              <div class="footer">
                <p>This is an automated email from Luco. Please do not reply to this email.</p>
                <p>If you need help, contact our support team.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Hello ${firstName},

You requested to reset your password for your Luco account.

Use this code to reset your password: ${resetToken}

This code will expire in 15 minutes.

If you didn't request this password reset, please ignore this email.

This is an automated email from Luco. Please do not reply.
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to: ${email}`);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }


  /**
   * Generate OTP email HTML template
   */
  generateOTPEmailTemplate(otp, organizationName) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Email Verification - Luco Platform</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .otp-code { font-size: 32px; font-weight: bold; color: #007bff; text-align: center; padding: 20px; background: white; border: 2px dashed #007bff; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Luco Platform</h1>
            </div>
            <div class="content">
              <h2>Verify Your Email Address</h2>
              <p>Thank you for registering your organization "<strong>${organizationName}</strong>" with Luco Platform.</p>
              <p>To complete your registration, please use the following verification code:</p>
              <div class="otp-code">${otp}</div>
              <p><strong>Important:</strong> This verification code expires in 10 minutes.</p>
              <p>If you didn't request this verification, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated email from Luco Platform. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate welcome email HTML template
   */
  generateWelcomeEmailTemplate(firstName, organizationName) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Luco Platform</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .features { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #28a745; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Luco Platform!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Congratulations! Your organization "<strong>${organizationName}</strong>" has been successfully registered on Luco Platform.</p>

              <div class="features">
                <h3>What you can do now:</h3>
                <ul>
                  <li>Create applications to organize your email campaigns</li>
                  <li>Verify sender identities (email addresses or domains)</li>
                  <li>Design and manage email templates</li>
                  <li>Send bulk emails through Amazon SES</li>
                  <li>Track detailed analytics and performance metrics</li>
                </ul>
              </div>

              <p>We're excited to have you on board and look forward to helping you streamline your email communications!</p>

              <p>If you have any questions, feel free to contact our support team.</p>
            </div>
            <div class="footer">
              <p>Thank you for choosing Luco Platform for your email marketing needs.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

// Create singleton instance
export const emailService = new EmailService();