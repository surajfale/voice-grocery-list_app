/**
 * Frontend Password Validation Utility
 * Mirrors backend validation for real-time feedback
 */

/**
 * Get password requirements for display
 * @returns {Array} - Array of requirement objects
 */
export const getPasswordRequirements = () => {
  return [
    {
      id: 'length',
      text: 'At least 8 characters long',
      test: (pwd) => pwd && pwd.length >= 8
    },
    {
      id: 'lowercase',
      text: 'One lowercase letter (a-z)',
      test: (pwd) => /[a-z]/.test(pwd)
    },
    {
      id: 'uppercase',
      text: 'One uppercase letter (A-Z)',
      test: (pwd) => /[A-Z]/.test(pwd)
    },
    {
      id: 'number',
      text: 'One number (0-9)',
      test: (pwd) => /[0-9]/.test(pwd)
    },
    {
      id: 'special',
      text: 'One special character (!@#$%^&*)',
      test: (pwd) => /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pwd)
    },
    {
      id: 'noRepeat',
      text: 'No 3+ consecutive repeating characters',
      test: (pwd) => !/(.)\1{2,}/.test(pwd)
    },
    {
      id: 'noRepeatDigits',
      text: 'No 3+ consecutive repeating digits',
      test: (pwd) => !/(\d)\1{2,}/.test(pwd)
    },
    {
      id: 'noSequential',
      text: 'No sequential characters (abc, 123)',
      test: (pwd) => !hasSequentialCharacters(pwd)
    },
    {
      id: 'noSpaces',
      text: 'No spaces allowed',
      test: (pwd) => !/\s/.test(pwd)
    }
  ];
};

/**
 * Check for sequential characters
 */
const hasSequentialCharacters = (password) => {
  if (!password || password.length < 3) {return false;}

  const lowerPassword = password.toLowerCase();

  for (let i = 0; i < lowerPassword.length - 2; i++) {
    const char1 = lowerPassword.charCodeAt(i);
    const char2 = lowerPassword.charCodeAt(i + 1);
    const char3 = lowerPassword.charCodeAt(i + 2);

    // Sequential ascending or descending
    if ((char2 === char1 + 1 && char3 === char2 + 1) ||
        (char2 === char1 - 1 && char3 === char2 - 1)) {
      return true;
    }
  }

  return false;
};

/**
 * Validate password and return results
 */
export const validatePassword = (password) => {
  const requirements = getPasswordRequirements();
  const results = requirements.map(req => ({
    ...req,
    met: req.test(password)
  }));

  const allMet = results.every(r => r.met);

  return {
    isValid: allMet,
    requirements: results,
    strength: calculatePasswordStrength(password, allMet)
  };
};

/**
 * Calculate password strength
 */
const calculatePasswordStrength = (password, isValid) => {
  if (!password) {
    return { score: 0, level: 'weak', percentage: 0, color: '#f44336' };
  }

  if (!isValid) {
    return { score: 0, level: 'weak', percentage: 25, color: '#f44336' };
  }

  let score = 0;

  // Length bonus
  score += Math.min(password.length * 2, 30);

  // Character variety
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  score += varietyCount * 10;

  // Uniqueness
  const uniqueChars = new Set(password).size;
  score += Math.min(uniqueChars * 2, 30);

  const percentage = Math.min(score, 100);

  let level = 'weak';
  let color = '#f44336';

  if (percentage >= 80) {
    level = 'strong';
    color = '#4caf50';
  } else if (percentage >= 60) {
    level = 'good';
    color = '#8bc34a';
  } else if (percentage >= 40) {
    level = 'fair';
    color = '#ff9800';
  }

  return { score, level, percentage, color };
};

export default {
  getPasswordRequirements,
  validatePassword
};
