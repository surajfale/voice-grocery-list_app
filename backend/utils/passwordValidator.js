/**
 * Password Validation Utility
 * Implements industry-standard password security requirements
 */

/**
 * Common weak passwords to block (top 100 most common)
 */
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'michael', 'football', 'password1', 'welcome', 'jesus', 'ninja',
  'mustang', 'password123', 'admin', 'login', 'admin123', 'root', 'pass'
];

/**
 * Validate password against all security requirements
 * @param {string} password - Password to validate
 * @param {string} email - User's email (to check similarity)
 * @param {string} firstName - User's first name (to check similarity)
 * @param {string} lastName - User's last name (to check similarity)
 * @returns {Object} - Validation result with success flag and errors array
 */
export const validatePassword = (password, email = '', firstName = '', lastName = '') => {
  const errors = [];

  // 1. Length requirements
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password && password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // 2. Character type requirements
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Special characters: !@#$%^&*()_+-=[]{}|;:,.<>?
  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  // 3. No more than 2 consecutive repeating characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password cannot contain 3 or more consecutive repeating characters');
  }

  // 4. No more than 2 consecutive repeating digits
  if (/(\d)\1{2,}/.test(password)) {
    errors.push('Password cannot contain 3 or more consecutive repeating digits');
  }

  // 5. No sequential characters (abc, 123, xyz)
  if (hasSequentialCharacters(password)) {
    errors.push('Password cannot contain sequential characters (e.g., abc, 123, xyz)');
  }

  // 6. No common/weak passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password');
  }

  // 7. No similarity to email/name
  if (email && isSimilarToEmail(password, email)) {
    errors.push('Password cannot be similar to your email address');
  }

  if (firstName && password.toLowerCase().includes(firstName.toLowerCase())) {
    errors.push('Password cannot contain your first name');
  }

  if (lastName && password.toLowerCase().includes(lastName.toLowerCase())) {
    errors.push('Password cannot contain your last name');
  }

  // 8. No spaces
  if (/\s/.test(password)) {
    errors.push('Password cannot contain spaces');
  }

  // 9. Check for common patterns
  if (hasCommonPatterns(password)) {
    errors.push('Password contains a common pattern. Please choose a more unique password');
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    strength: calculatePasswordStrength(password, errors)
  };
};

/**
 * Check for sequential characters (abc, 123, xyz, etc.)
 * @param {string} password - Password to check
 * @returns {boolean} - True if sequential characters found
 */
const hasSequentialCharacters = (password) => {
  const lowerPassword = password.toLowerCase();

  // Check for 3+ sequential letters
  for (let i = 0; i < lowerPassword.length - 2; i++) {
    const char1 = lowerPassword.charCodeAt(i);
    const char2 = lowerPassword.charCodeAt(i + 1);
    const char3 = lowerPassword.charCodeAt(i + 2);

    // Sequential ascending (abc, 123)
    if (char2 === char1 + 1 && char3 === char2 + 1) {
      return true;
    }

    // Sequential descending (cba, 321)
    if (char2 === char1 - 1 && char3 === char2 - 1) {
      return true;
    }
  }

  return false;
};

/**
 * Check if password is similar to email
 * @param {string} password - Password to check
 * @param {string} email - Email to compare
 * @returns {boolean} - True if similar
 */
const isSimilarToEmail = (password, email) => {
  const emailUsername = email.split('@')[0].toLowerCase();
  const lowerPassword = password.toLowerCase();

  // Check if password contains significant part of email username
  if (emailUsername.length >= 4 && lowerPassword.includes(emailUsername)) {
    return true;
  }

  // Check if email username contains significant part of password
  if (lowerPassword.length >= 4 && emailUsername.includes(lowerPassword)) {
    return true;
  }

  return false;
};

/**
 * Check for common keyboard patterns
 * @param {string} password - Password to check
 * @returns {boolean} - True if common pattern found
 */
const hasCommonPatterns = (password) => {
  const commonPatterns = [
    'qwerty', 'asdfgh', 'zxcvbn', 'qwertyuiop', 'asdfghjkl',
    '1q2w3e4r', 'qazwsx', 'zaq1zaq1', '1qaz2wsx',
    '12345', '123456', '1234567', '12345678', '123456789',
    'abcdef', 'password', 'passw0rd'
  ];

  const lowerPassword = password.toLowerCase();

  for (const pattern of commonPatterns) {
    if (lowerPassword.includes(pattern)) {
      return true;
    }
  }

  return false;
};

/**
 * Calculate password strength score
 * @param {string} password - Password to evaluate
 * @param {Array} errors - Current validation errors
 * @returns {Object} - Strength score and level
 */
const calculatePasswordStrength = (password, errors) => {
  if (errors.length > 0) {
    return {
      score: 0,
      level: 'weak',
      percentage: 0
    };
  }

  let score = 0;

  // Length bonus (up to 30 points)
  score += Math.min(password.length * 2, 30);

  // Character variety bonus (up to 40 points)
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  score += varietyCount * 10;

  // Uniqueness bonus (up to 30 points)
  const uniqueChars = new Set(password).size;
  score += Math.min(uniqueChars * 2, 30);

  // Normalize to 100
  const percentage = Math.min(score, 100);

  let level = 'weak';
  if (percentage >= 80) {level = 'strong';}
  else if (percentage >= 60) {level = 'good';}
  else if (percentage >= 40) {level = 'fair';}

  return {
    score,
    level,
    percentage
  };
};

/**
 * Get password requirements for display
 * @returns {Array} - Array of requirement objects
 */
export const getPasswordRequirements = () => {
  return [
    { id: 'length', text: 'At least 8 characters long', regex: /.{8,}/ },
    { id: 'lowercase', text: 'At least one lowercase letter (a-z)', regex: /[a-z]/ },
    { id: 'uppercase', text: 'At least one uppercase letter (A-Z)', regex: /[A-Z]/ },
    { id: 'number', text: 'At least one number (0-9)', regex: /[0-9]/ },
    { id: 'special', text: 'At least one special character (!@#$%^&*)', regex: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/ },
    { id: 'noRepeat', text: 'No more than 2 consecutive repeating characters', test: (pwd) => !/(.)\1{2,}/.test(pwd) },
    { id: 'noRepeatDigits', text: 'No more than 2 consecutive repeating digits', test: (pwd) => !/(\d)\1{2,}/.test(pwd) },
    { id: 'noSequential', text: 'No sequential characters (abc, 123)', test: (pwd) => !hasSequentialCharacters(pwd) },
    { id: 'noSpaces', text: 'No spaces allowed', regex: /^\S+$/ },
  ];
};

/**
 * Check individual requirement
 * @param {string} password - Password to check
 * @param {Object} requirement - Requirement object
 * @returns {boolean} - True if requirement met
 */
export const checkRequirement = (password, requirement) => {
  if (requirement.regex) {
    return requirement.regex.test(password);
  }
  if (requirement.test) {
    return requirement.test(password);
  }
  return false;
};

export default {
  validatePassword,
  getPasswordRequirements,
  checkRequirement
};
