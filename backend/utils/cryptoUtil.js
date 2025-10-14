import crypto from 'crypto';

// AES-256-GCM utilities for encrypting and decrypting small secrets.
// Usage:
// - Generate a key (base64) with: generateKey()
// - Encrypt: encryptText(plainText, keyBase64)
// - Decrypt: decryptText(encryptedString, keyBase64)

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended for GCM

function keyFromString(keyStr) {
  if (!keyStr) {
    throw new Error('Key is required');
  }
  // Accept base64 (recommended) or hex
  if (/^[0-9a-fA-F]{64}$/.test(keyStr)) {
    return Buffer.from(keyStr, 'hex');
  }
  return Buffer.from(keyStr, 'base64');
}

export function generateKey() {
  // Return base64-encoded 32-byte key
  return crypto.randomBytes(32).toString('base64');
}

export function encryptText(plainText, keyBase64) {
  const key = keyFromString(keyBase64);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store as base64 parts joined by ':' -> iv:tag:cipher
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptText(encryptedString, keyBase64) {
  const key = keyFromString(keyBase64);
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }
  const iv = Buffer.from(parts[0], 'base64');
  const tag = Buffer.from(parts[1], 'base64');
  const cipherText = Buffer.from(parts[2], 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return decrypted.toString('utf8');
}

export default {
  generateKey,
  encryptText,
  decryptText,
};
