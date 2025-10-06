import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import emailTemplates from '../templates/emailTemplates.js';
import { decryptText } from '../utils/cryptoUtil.js';

dotenv.config();

/**
 * Email Service for sending password reset emails
 * Uses nodemailer with SMTP configuration from environment variables
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter with SMTP configuration
   */
  initializeTransporter() {
    // Resolve SMTP password: prefer encrypted payload EMAIL_PASS_ENC + key EMAIL_PASS_KEY
    let smtpPass = process.env.EMAIL_PASS;
    if (process.env.EMAIL_PASS_ENC && process.env.EMAIL_PASS_KEY) {
      try {
        smtpPass = decryptText(process.env.EMAIL_PASS_ENC, process.env.EMAIL_PASS_KEY);
      } catch (err) {
        console.warn('⚠️ Failed to decrypt EMAIL_PASS_ENC, falling back to EMAIL_PASS if present:', err.message);
      }
    }

    // Check if email configuration is available
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !smtpPass) {
      console.warn('⚠️ Email configuration missing. Password reset emails will not be sent.');
      console.warn('Please set EMAIL_HOST, EMAIL_USER, EMAIL_PASS (or EMAIL_PASS_ENC + EMAIL_PASS_KEY), and EMAIL_FROM in environment');
      return;
    }

    try {
      const transportConfig = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: smtpPass,
        },
        tls: {
          // For development: accept self-signed certificates
          // For production: remove this or set to true
          rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false,
          // Minimum TLS version
          minVersion: 'TLSv1.2',
        },
        // Connection timeout
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      };

      this.transporter = nodemailer.createTransport(transportConfig);

      // Verify connection configuration
      this.transporter.verify((error) => {
        if (error) {
          console.error('❌ Email service verification failed:', error.message);
          console.warn('⚠️ Emails may not be sent. Please check your email configuration.');
        } else {
          console.log('✅ Email service initialized and verified successfully');
        }
      });
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  /**
   * Send welcome email to new user
   * @param {string} to - Recipient email address
   * @param {string} userName - User's first name
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail(to, userName) {
    if (!this.transporter) {
      console.error('Email transporter not initialized. Cannot send email.');
      throw new Error('Email service not configured');
    }

    const template = emailTemplates.welcomeEmail({
      userName,
      userEmail: to
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      throw new Error('Failed to send welcome email');
    }
  }

  /**
   * Send password reset email to user
   * @param {string} to - Recipient email address
   * @param {string} resetToken - Password reset token
   * @param {string} userName - User's first name
   * @param {string} requestIP - IP address of request
   * @param {Date} requestTime - Time of request
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail(to, resetToken, userName, requestIP, requestTime) {
    if (!this.transporter) {
      console.error('Email transporter not initialized. Cannot send email.');
      throw new Error('Email service not configured');
    }

    const template = emailTemplates.passwordResetEmail({
      userName,
      resetToken,
      userEmail: to,
      requestIP,
      requestTime
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send password reset confirmation email to user
   * @param {string} to - Recipient email address
   * @param {string} userName - User's first name
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetConfirmation(to, userName) {
    if (!this.transporter) {
      console.error('Email transporter not initialized. Cannot send email.');
      throw new Error('Email service not configured');
    }

    const template = emailTemplates.passwordResetConfirmation({
      userName
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset confirmation email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset confirmation email:', error);
      throw new Error('Failed to send confirmation email');
    }
  }
}

// Export singleton instance
export default new EmailService();
