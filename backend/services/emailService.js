import { Resend } from 'resend';
import dotenv from 'dotenv';
import emailTemplates from '../templates/emailTemplates.js';

dotenv.config();

/**
 * Email Service for sending password reset emails
 * Uses Resend API for email delivery
 */
class EmailService {
  constructor() {
    this.resend = null;
    this.initializeResend();
  }

  /**
   * Initialize Resend client with API key from environment
   */
  initializeResend() {
    // Check if Resend API key is available
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY missing. Password reset emails will not be sent.');
      console.warn('Please set RESEND_API_KEY and EMAIL_FROM in environment');
      return;
    }

    if (!process.env.EMAIL_FROM) {
      console.warn('⚠️ EMAIL_FROM missing. Please set a verified sender email in environment');
      return;
    }

    try {
      this.resend = new Resend(process.env.RESEND_API_KEY);

      // Masked API key for logs
      const maskedKey = process.env.RESEND_API_KEY.replace(/^(.{4}).+(.{4})$/, '$1***$2');
      console.log(`✉️ Resend client initialized with key: ${maskedKey}`);
      console.log(`✅ Email service initialized successfully with sender: ${process.env.EMAIL_FROM}`);
    } catch (error) {
      console.error('❌ Failed to initialize Resend client:', error);
      this.resend = null;
    }
  }

  /**
   * Send welcome email to new user
   * @param {string} to - Recipient email address
   * @param {string} userName - User's first name
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail(to, userName) {
    if (!this.resend) {
      console.error('Resend client not initialized. Cannot send email.');
      throw new Error('Email service not configured');
    }

    const template = emailTemplates.welcomeEmail({
      userName,
      userEmail: to
    });

    try {
      const { data, error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (error) {
        console.error('❌ Failed to send welcome email:', error);
        throw new Error('Failed to send welcome email');
      }

      console.log('✅ Welcome email sent:', data?.id);
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
    if (!this.resend) {
      console.error('Resend client not initialized. Cannot send email.');
      throw new Error('Email service not configured');
    }

    const template = emailTemplates.passwordResetEmail({
      userName,
      resetToken,
      userEmail: to,
      requestIP,
      requestTime
    });

    try {
      const { data, error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (error) {
        console.error('❌ Failed to send password reset email:', error);
        throw new Error('Failed to send password reset email');
      }

      console.log('✅ Password reset email sent:', data?.id);
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
    if (!this.resend) {
      console.error('Resend client not initialized. Cannot send email.');
      throw new Error('Email service not configured');
    }

    const template = emailTemplates.passwordResetConfirmation({
      userName
    });

    try {
      const { data, error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (error) {
        console.error('❌ Failed to send password reset confirmation email:', error);
        throw new Error('Failed to send confirmation email');
      }

      console.log('✅ Password reset confirmation email sent:', data?.id);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset confirmation email:', error && error.message ? error.message : error);
      throw new Error('Failed to send confirmation email');
    }
  }

  /**
   * Send account deletion confirmation email to user
   * @param {string} to - Recipient email address
   * @param {string} userName - User's first name
   * @returns {Promise<boolean>} - Success status
   */
  async sendAccountDeletionConfirmation(to, userName) {
    if (!this.resend) {
      console.error('Resend client not initialized. Cannot send email.');
      throw new Error('Email service not configured');
    }

    const template = emailTemplates.accountDeletionConfirmation({
      userName,
      userEmail: to
    });

    try {
      const { data, error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (error) {
        console.error('❌ Failed to send account deletion confirmation email:', error);
        throw new Error('Failed to send deletion confirmation email');
      }

      console.log('✅ Account deletion confirmation email sent:', data?.id);
      return true;
    } catch (error) {
      console.error('❌ Failed to send account deletion confirmation email:', error && error.message ? error.message : error);
      throw new Error('Failed to send deletion confirmation email');
    }
  }
}

// Export singleton instance
export default new EmailService();
