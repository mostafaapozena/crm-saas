'use strict';

const crypto = require('crypto');

const ALGO = 'aes-256-cbc';

/**
 * Returns a 32-byte AES key.
 * Prefers TOKEN_ENCRYPTION_KEY (64 hex chars) from env; falls back to a
 * SHA-256 hash of JWT_SECRET so the key is consistent across restarts
 * without requiring a separate env var in dev.
 */
function _key() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (raw && raw !== 'your_token_encryption_key' && raw.length === 64) {
    return Buffer.from(raw, 'hex');
  }
  return crypto.createHash('sha256')
    .update(process.env.JWT_SECRET || 'dev-fallback-key')
    .digest();
}

/**
 * Encrypts a plaintext string and returns { encrypted, iv } both as hex strings.
 */
function encryptToken(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, _key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { encrypted: enc.toString('hex'), iv: iv.toString('hex') };
}

/**
 * Decrypts an AES-CBC encrypted token.
 * If ivHex is null/undefined the encryptedHex is returned as-is for
 * backward-compatibility with unencrypted tokens stored before this change.
 */
function decryptToken(encryptedHex, ivHex) {
  if (!ivHex) return encryptedHex; // legacy plaintext token
  try {
    const decipher = crypto.createDecipheriv(ALGO, _key(), Buffer.from(ivHex, 'hex'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  } catch (err) {
    console.error('[TokenCrypto] Decrypt failed:', err.message);
    return null;
  }
}

module.exports = { encryptToken, decryptToken };
