/**
 * Email Templates Module
 * Centralized email templates for consistent branding and maintainability
 */

/**
 * Base HTML template wrapper for all emails
 * @param {string} content - Email content HTML
 * @returns {string} - Complete HTML email
 */
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #2196f3, #4caf50);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header .icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .content {
      padding: 40px 30px;
      background: #ffffff;
    }
    .content h2 {
      color: #2196f3;
      margin-top: 0;
      font-size: 24px;
    }
    .content p {
      margin: 15px 0;
      color: #555;
    }
    .button {
      display: inline-block;
      padding: 15px 30px;
      background: linear-gradient(45deg, #2196f3, #4caf50);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background: linear-gradient(45deg, #1976d2, #388e3c);
    }
    .info-box {
      background: #f0f7ff;
      border-left: 4px solid #2196f3;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .success-box {
      background: #d4edda;
      border-left: 4px solid #28a745;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      font-size: 13px;
      color: #666;
      border-top: 1px solid #e9ecef;
    }
    .footer a {
      color: #2196f3;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background: #e9ecef;
      margin: 30px 0;
    }
    ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    ul li {
      margin: 8px 0;
      color: #555;
    }
    .link-box {
      word-break: break-all;
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      color: #2196f3;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${content}
    <div class="footer">
      <p><strong>🛒 Grocery List App</strong></p>
      <p>Your smart shopping companion</p>
      <div class="divider" style="max-width: 200px; margin: 20px auto;"></div>
      <p>This is an automated email. Please do not reply to this message.</p>
      <p>&copy; ${new Date().getFullYear()} Grocery List App. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Welcome Email Template
 * Sent to new users after successful registration
 * @param {Object} params - Template parameters
 * @param {string} params.userName - User's first name
 * @param {string} params.userEmail - User's email address
 * @returns {Object} - Email subject and HTML/text content
 */
export const welcomeEmail = ({ userName, userEmail }) => {
  const htmlContent = `
    <div class="header">
      <div class="icon">🎉</div>
      <h1>Welcome to Grocery List App!</h1>
    </div>
    <div class="content">
      <h2>Hello ${userName}! 👋</h2>
      <p>Thank you for joining Grocery List App! We're thrilled to have you on board.</p>

      <div class="success-box">
        <strong>✅ Your account has been successfully created!</strong>
      </div>

      <p>With Grocery List App, you can:</p>
      <ul>
        <li>🎤 <strong>Add items using voice recognition</strong> - Just speak naturally!</li>
        <li>🏷️ <strong>Smart categorization</strong> - Items are automatically organized</li>
        <li>☁️ <strong>Cloud sync</strong> - Access your lists from any device</li>
        <li>✨ <strong>Spell correction</strong> - Intelligent suggestions for better accuracy</li>
        <li>📱 <strong>Mobile-friendly</strong> - Shop on the go with ease</li>
      </ul>

      <div class="info-box">
        <strong>📧 Your account email:</strong> ${userEmail}
      </div>

      <p>Ready to get started? Log in now and create your first grocery list!</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">
          Start Shopping 🛒
        </a>
      </div>

      <div class="divider"></div>

      <p style="font-size: 14px; color: #666;">
        <strong>Need help?</strong> Check out the built-in help guide in the app or contact our support team.
      </p>

      <p style="font-size: 14px; color: #666;">
        Happy shopping! 🎊
      </p>
    </div>
  `;

  const textContent = `
Welcome to Grocery List App!

Hello ${userName}! 👋

Thank you for joining Grocery List App! We're thrilled to have you on board.

✅ Your account has been successfully created!

With Grocery List App, you can:
- 🎤 Add items using voice recognition - Just speak naturally!
- 🏷️ Smart categorization - Items are automatically organized
- ☁️ Cloud sync - Access your lists from any device
- ✨ Spell correction - Intelligent suggestions for better accuracy
- 📱 Mobile-friendly - Shop on the go with ease

Your account email: ${userEmail}

Ready to get started? Log in now and create your first grocery list!
Visit: ${process.env.FRONTEND_URL || 'http://localhost:5173'}

Need help? Check out the built-in help guide in the app or contact our support team.

Happy shopping! 🎊
  `;

  return {
    subject: 'Welcome to Grocery List App! 🎉',
    html: baseTemplate(htmlContent),
    text: textContent
  };
};

/**
 * Helper function to mask email address for security
 * @param {string} email - Email address to mask
 * @returns {string} - Masked email address
 */
const maskEmail = (email) => {
  const [username, domain] = email.split('@');
  if (username.length <= 3) {
    return `${username[0]}***@${domain}`;
  }
  const visiblePart = username.slice(0, 3);
  return `${visiblePart}***@${domain}`;
};

/**
 * Helper function to format IP address for display
 * @param {string} ip - IP address
 * @returns {string} - Formatted IP or location
 */
const formatIPAddress = (ip) => {
  if (!ip) {return 'Unknown location';}
  // Mask last octet for privacy
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  }
  return 'Unknown location';
};

/**
 * Password Reset Request Email Template
 * Sent when user requests password reset
 * @param {Object} params - Template parameters
 * @param {string} params.userName - User's first name
 * @param {string} params.resetToken - Password reset token
 * @param {string} params.userEmail - User's email address
 * @param {string} params.requestIP - IP address of request
 * @param {Date} params.requestTime - Time of request
 * @returns {Object} - Email subject and HTML/text content
 */
export const passwordResetEmail = ({ userName, resetToken, userEmail, requestIP, requestTime }) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Ensure HTTPS in production
  const secureFrontendUrl = process.env.NODE_ENV === 'production'
    ? frontendUrl.replace('http://', 'https://')
    : frontendUrl;

  const resetUrl = `${secureFrontendUrl}?token=${resetToken}`;
  const maskedEmail = maskEmail(userEmail);
  const formattedIP = formatIPAddress(requestIP);
  const requestTimeStr = requestTime ? new Date(requestTime).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }) : new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  });

  const htmlContent = `
    <div class="header">
      <div class="icon">🔐</div>
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <h2>Hello ${userName}!</h2>
      <p>We received a request to reset your password for your Grocery List App account.</p>

      <div class="info-box">
        <strong>🔍 Request Details (Anti-Phishing Verification):</strong>
        <ul style="margin: 10px 0; list-style: none; padding-left: 0;">
          <li><strong>Account:</strong> ${maskedEmail}</li>
          <li><strong>Request Time:</strong> ${requestTimeStr} UTC</li>
          <li><strong>Request Location:</strong> ${formattedIP}</li>
          <li><strong>One-Time Use:</strong> This link can only be used once</li>
        </ul>
      </div>

      <p>Click the button below to create a new password:</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" class="button">
          Reset Password 🔑
        </a>
      </div>

      <p style="font-size: 13px; color: #666;">Or copy and paste this secure link into your browser:</p>
      <div class="link-box">${resetUrl}</div>

      <div class="warning-box">
        <strong>⚠️ Critical Security Information:</strong>
        <ul style="margin: 10px 0;">
          <li>This link will expire in <strong>1 hour</strong></li>
          <li>The link can only be used <strong>once</strong></li>
          <li>If you didn't request this, <strong>ignore this email</strong> and your password won't change</li>
          <li><strong>Never share this link</strong> with anyone - not even Grocery List App support</li>
          <li>Check the URL starts with: <code>${secureFrontendUrl}</code></li>
        </ul>
      </div>

      <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <strong>🛡️ How to Spot a Phishing Email:</strong>
        <ul style="margin: 10px 0; font-size: 13px;">
          <li>We will never ask for your password via email</li>
          <li>Always verify the sender's email address</li>
          <li>Check the URL before clicking (hover to preview)</li>
          <li>Look for HTTPS and the correct domain name</li>
        </ul>
        <p style="margin: 10px 0 0 0; font-size: 13px;">
          <strong>Suspicious email?</strong> Forward to: <a href="mailto:${process.env.EMAIL_USER || 'surajfale520@gmail.com'}" style="color: #ff9800;">${process.env.EMAIL_USER || 'surajfale520@gmail.com'}</a>
        </p>
      </div>

      <div class="divider"></div>

      <p style="font-size: 12px; color: #999; text-align: center;">
        <strong>Email sent from Grocery List App Official</strong><br>
        If you're having trouble clicking the button, copy and paste the URL above into your web browser.
      </p>
    </div>
  `;

  const textContent = `
Password Reset Request

Hello ${userName}!

We received a request to reset your password for your Grocery List App account.

🔍 REQUEST DETAILS (Anti-Phishing Verification):
- Account: ${maskedEmail}
- Request Time: ${requestTimeStr} UTC
- Request Location: ${formattedIP}
- One-Time Use: This link can only be used once

Click the link below to create a new password:
${resetUrl}

⚠️ CRITICAL SECURITY INFORMATION:
- This link will expire in 1 hour
- The link can only be used ONCE
- If you didn't request this, ignore this email and your password won't change
- NEVER share this link with anyone - not even Grocery List App support
- Check the URL starts with: ${secureFrontendUrl}

🛡️ HOW TO SPOT A PHISHING EMAIL:
- We will never ask for your password via email
- Always verify the sender's email address
- Check the URL before clicking
- Look for HTTPS and the correct domain name

Suspicious email? Forward to: ${process.env.EMAIL_USER || 'surajfale520@gmail.com'}

Email sent from Grocery List App Official
  `;

  return {
    subject: 'Password Reset Request - Grocery List App 🔐',
    html: baseTemplate(htmlContent),
    text: textContent
  };
};

/**
 * Password Reset Confirmation Email Template
 * Sent after successful password reset
 * @param {Object} params - Template parameters
 * @param {string} params.userName - User's first name
 * @returns {Object} - Email subject and HTML/text content
 */
export const passwordResetConfirmation = ({ userName }) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}`;

  const htmlContent = `
    <div class="header">
      <div class="icon">✅</div>
      <h1>Password Reset Successful</h1>
    </div>
    <div class="content">
      <h2>Hello ${userName}!</h2>

      <div class="success-box">
        <strong>✅ Your password has been successfully reset!</strong>
      </div>

      <p>You can now log in to your Grocery List App account using your new password.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" class="button">
          Log In Now 🔓
        </a>
      </div>

      <div class="warning-box">
        <strong>⚠️ Didn't make this change?</strong>
        <p style="margin: 10px 0;">
          If you did not reset your password, please contact our support team immediately,
          as this may indicate unauthorized access to your account.
        </p>
      </div>

      <div class="info-box">
        <strong>🔒 Security Tips:</strong>
        <ul style="margin: 10px 0;">
          <li>Use a strong, unique password</li>
          <li>Don't share your password with anyone</li>
          <li>Enable two-factor authentication if available</li>
          <li>Change your password regularly</li>
        </ul>
      </div>

      <div class="divider"></div>

      <p style="font-size: 14px; color: #666;">
        Thank you for keeping your account secure!
      </p>
    </div>
  `;

  const textContent = `
Password Reset Successful

Hello ${userName}!

✅ Your password has been successfully reset!

You can now log in to your Grocery List App account using your new password.

Log in at: ${loginUrl}

⚠️ Didn't make this change?
If you did not reset your password, please contact our support team immediately,
as this may indicate unauthorized access to your account.

🔒 Security Tips:
- Use a strong, unique password
- Don't share your password with anyone
- Enable two-factor authentication if available
- Change your password regularly

Thank you for keeping your account secure!
  `;

  return {
    subject: 'Password Reset Successful - Grocery List App ✅',
    html: baseTemplate(htmlContent),
    text: textContent
  };
};

/**
 * Account Deletion Confirmation Email Template
 * Sent after user data has been deleted but before account removal
 * @param {Object} params - Template parameters
 * @param {string} params.userName - User's first name
 * @param {string} params.userEmail - User's email address
 * @returns {Object} - Email subject and HTML/text content
 */
export const accountDeletionConfirmation = ({ userName, userEmail }) => {
  const htmlContent = `
    <div class="header">
      <div class="icon">👋</div>
      <h1>Account Deletion Confirmed</h1>
    </div>
    <div class="content">
      <h2>Goodbye ${userName}</h2>
      <p>We're sorry to see you go! Your account deletion request has been processed.</p>

      <div class="success-box">
        <strong>✅ Your data has been permanently deleted</strong>
      </div>

      <p>The following data has been permanently removed from our servers:</p>
      <ul>
        <li>All grocery lists and items</li>
        <li>Personal preferences and settings</li>
        <li>Account history and activity logs</li>
        <li>All user-generated content</li>
      </ul>

      <div class="info-box">
        <strong>📧 Final confirmation:</strong>
        <p style="margin: 10px 0;">Your account (<strong>${userEmail}</strong>) will be completely removed from our system after this email is sent.</p>
      </div>

      <div class="warning-box">
        <strong>⚠️ This action is irreversible</strong>
        <p style="margin: 10px 0;">
          If you wish to use Grocery List App again in the future, you'll need to create a new account.
        </p>
      </div>

      <div class="divider"></div>

      <p style="font-size: 14px; color: #666;">
        <strong>Changed your mind?</strong><br>
        If you deleted your account by mistake, you can create a new account anytime at our website.
        However, your previous data cannot be recovered.
      </p>

      <div class="divider"></div>

      <p style="font-size: 14px; color: #666;">
        Thank you for using Grocery List App. We hope to see you again in the future! 💚
      </p>
    </div>
  `;

  const textContent = `
Goodbye ${userName}

We're sorry to see you go! Your account deletion request has been processed.

✅ Your data has been permanently deleted

The following data has been permanently removed from our servers:
- All grocery lists and items
- Personal preferences and settings
- Account history and activity logs
- All user-generated content

📧 Final confirmation:
Your account (${userEmail}) will be completely removed from our system after this email is sent.

⚠️ This action is irreversible
If you wish to use Grocery List App again in the future, you'll need to create a new account.

Changed your mind?
If you deleted your account by mistake, you can create a new account anytime at our website.
However, your previous data cannot be recovered.

Thank you for using Grocery List App. We hope to see you again in the future! 💚
  `;

  return {
    subject: 'Account Deletion Confirmed - Grocery List App 👋',
    html: baseTemplate(htmlContent),
    text: textContent
  };
};

export default {
  welcomeEmail,
  passwordResetEmail,
  passwordResetConfirmation,
  accountDeletionConfirmation
};
