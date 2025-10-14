#!/usr/bin/env node
import { encryptText, generateKey } from '../utils/cryptoUtil.js';

// Simple CLI: node encrypt-secret.js "my-secret" [base64-key]
// If no key provided, prints a newly generated base64 key and the encrypted payload.

const [,, secret, key] = process.argv;
if (!secret) {
  console.error('Usage: node encrypt-secret.js "<secret>" [base64-key]');
  // eslint-disable-next-line no-process-exit
  process.exit(2);
}

let usedKey = key;
if (!usedKey) {
  usedKey = generateKey();
  console.log('# Generated key (store this safely, e.g., Railway secret EMAIL_PASS_KEY):');
  console.log(usedKey);
}

const encrypted = encryptText(secret, usedKey);
console.log('# Encrypted payload (store this in EMAIL_PASS_ENC):');
console.log(encrypted);
