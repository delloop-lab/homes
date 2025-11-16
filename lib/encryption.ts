/**
 * Simple encryption utility for sensitive data like passwords
 * Uses AES-256-GCM for authenticated encryption
 * 
 * IMPORTANT: Set ENCRYPTION_KEY environment variable in your .env.local file
 * Generate a key with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 16 bytes for AES
const SALT_LENGTH = 64 // 64 bytes for salt
const TAG_LENGTH = 16 // 16 bytes for GCM tag
const KEY_LENGTH = 32 // 32 bytes for AES-256

/**
 * Get encryption key from environment variable
 * Falls back to a default key in development (NOT SECURE for production)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production')
    }
    // Development fallback - WARNING: This is not secure!
    console.warn('⚠️  WARNING: Using default encryption key. Set ENCRYPTION_KEY in .env.local for production!')
    return crypto.scryptSync('default-dev-key-change-in-production', 'salt', KEY_LENGTH)
  }
  
  // If key is hex string, convert to buffer
  if (key.length === 64) {
    return Buffer.from(key, 'hex')
  }
  
  // Otherwise derive key from string
  return crypto.scryptSync(key, 'salt', KEY_LENGTH)
}

/**
 * Encrypt a plaintext string
 * Returns a hex-encoded string containing: salt + iv + tag + encrypted_data
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return ''
  
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const salt = crypto.randomBytes(SALT_LENGTH)
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Get authentication tag
    const tag = cipher.getAuthTag()
    
    // Combine: salt + iv + tag + encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ])
    
    return combined.toString('hex')
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt an encrypted string
 * Expects hex-encoded string containing: salt + iv + tag + encrypted_data
 */
export function decrypt(encryptedHex: string): string {
  if (!encryptedHex) return ''
  
  try {
    const key = getEncryptionKey()
    const combined = Buffer.from(encryptedHex, 'hex')
    
    // Extract components
    let offset = 0
    const salt = combined.slice(offset, offset + SALT_LENGTH)
    offset += SALT_LENGTH
    const iv = combined.slice(offset, offset + IV_LENGTH)
    offset += IV_LENGTH
    const tag = combined.slice(offset, offset + TAG_LENGTH)
    offset += TAG_LENGTH
    const encrypted = combined.slice(offset)
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    // Decrypt
    let decrypted = decipher.update(encrypted, undefined, 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data - data may be corrupted or key may be incorrect')
  }
}

/**
 * Obfuscate a string for display (shows dots instead of actual characters)
 */
export function obfuscate(value: string | null | undefined, length: number = 8): string {
  if (!value) return ''
  return '•'.repeat(Math.min(length, 12))
}



