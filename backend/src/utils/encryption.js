const crypto = require('crypto');

// AES-256-GCM symmetric encryption for sensitive medical data at rest.
// Key is derived deterministically from the server secret via scrypt so a
// rotation only requires rotating that secret.
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;
const KDF_SALT = 'goupyl-sport-parq-v1';

let cachedKey = null;
const getKey = () => {
  if (cachedKey) return cachedKey;
  const secret = process.env.PARQ_ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('Missing secret for PARQ encryption (set PARQ_ENCRYPTION_KEY or JWT_ACCESS_SECRET).');
  }
  cachedKey = crypto.scryptSync(secret, KDF_SALT, 32);
  return cachedKey;
};

/**
 * Encrypts a JS value (object/array/string) and returns a base64 envelope:
 * `<iv>:<authTag>:<ciphertext>` — all base64.
 */
const encryptJson = (value) => {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
};

/**
 * Decrypts an envelope produced by `encryptJson` back into the original value.
 * Returns `null` if the payload is malformed or the auth tag does not match.
 */
const decryptJson = (envelope) => {
  if (typeof envelope !== 'string') return null;
  const parts = envelope.split(':');
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = Buffer.from(parts[2], 'base64');
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) return null;
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch (_err) {
    return null;
  }
};

module.exports = { encryptJson, decryptJson };
