// src/main/store/crypto.ts

import { createCipheriv, randomBytes, createDecipheriv, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;

export function encrypt(text: string, password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, KEY_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return Buffer.from(
    JSON.stringify({
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      encrypted
    })
  ).toString('base64');
}

export function decrypt(cipherText: string, password: string): string {
  const data = JSON.parse(Buffer.from(cipherText, 'base64').toString());

  const salt = Buffer.from(data.salt, 'base64');
  const iv = Buffer.from(data.iv, 'base64');
  const authTag = Buffer.from(data.authTag, 'base64');

  const key = scryptSync(password, salt, KEY_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = decipher.update(data.encrypted, 'base64', 'utf8') + decipher.final('utf8');
  return decrypted;
}
