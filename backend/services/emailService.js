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
        // Increase timeouts to avoid transient connection timeouts in some hosts
        connectionTimeout: parseInt(process.env.EMAIL_CONNECTION_TIMEOUT || '30000'),
        greetingTimeout: parseInt(process.env.EMAIL_GREETING_TIMEOUT || '10000'),
        socketTimeout: parseInt(process.env.EMAIL_SOCKET_TIMEOUT || '30000'),
      };

      // Masked debug info for logs
      const maskedUser = process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/(.{2}).+(@.+)/, '$1***$2') : '<not-set>';
      console.log(`✉️ Initializing email transporter -> host=${process.env.EMAIL_HOST}:${transportConfig.port} user=${maskedUser}`);

      this.transporter = nodemailer.createTransport(transportConfig);

      // Verify connection configuration
      this.transporter.verify((error) => {
        if (error) {
          console.error('❌ Email service verification failed:', error && error.message ? error.message : error);
          console.warn('⚠️ Emails may not be sent. Please check your email configuration and network (SMTP host, port, firewall, provider policies).');
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
      const info = await this.sendMailWithRetry(mailOptions);
      console.log('✅ Welcome email sent:', info && info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error && error.message ? error.message : error);
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
      const info = await this.sendMailWithRetry(mailOptions);
      console.log('✅ Password reset email sent:', info && info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error && error.message ? error.message : error);
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
      const info = await this.sendMailWithRetry(mailOptions);
      console.log('✅ Password reset confirmation email sent:', info && info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset confirmation email:', error && error.message ? error.message : error);
      throw new Error('Failed to send confirmation email');
    }
  }

  /**
   * Send mail with retries on transient network errors (ETIMEDOUT, ECONNRESET, ENOTFOUND)
   * @param {object} mailOptions
   * @param {number} attempts
   */
  async sendMailWithRetry(mailOptions, attempts = 3) {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    let attempt = 0;
    const transientErrors = new Set(['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED']);

    while (attempt < attempts) {
      try {
        attempt += 1;
        if (attempt > 1) console.log(`↻ Retrying email send (attempt ${attempt}/${attempts})`);
        const info = await this.transporter.sendMail(mailOptions);
        return info;
      } catch (err) {
        const code = err && err.code ? err.code : null;
        const isTransient = code && transientErrors.has(code);
        console.error(`Email send failed (attempt ${attempt}):`, err && err.message ? err.message : err, code ? `code=${code}` : '');
        if (!isTransient || attempt >= attempts) {
          throw err;
        }
        // exponential backoff
        const delay = Math.min(30000, 500 * Math.pow(2, attempt - 1));
        await new Promise((res) => setTimeout(res, delay));
      }
    }
    throw new Error('Failed to send email after retries');
  }
}

// Export singleton instance
export default new EmailService();
