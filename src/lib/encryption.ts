import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY
  ? Buffer.from(process.env.ENCRYPTION_SECRET_KEY, 'hex')
  : Buffer.alloc(32) // Fallback for build time (will fail at runtime if not set)

/**
 * Encrypts text using AES-256-GCM
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export function encrypt(text: string): string {
  if (!process.env.ENCRYPTION_SECRET_KEY) {
    throw new Error('ENCRYPTION_SECRET_KEY environment variable is not set')
  }

  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, SECRET_KEY, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypts text encrypted with encrypt()
 * @param encryptedText - Encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted plain text or null if decryption fails
 */
export function decrypt(encryptedText: string): string | null {
  if (!process.env.ENCRYPTION_SECRET_KEY) {
    throw new Error('ENCRYPTION_SECRET_KEY environment variable is not set')
  }

  try {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':')

    if (!ivHex || !authTagHex || !encrypted) {
      console.error('Invalid encrypted text format')
      return null
    }

    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = createDecipheriv(ALGORITHM, SECRET_KEY, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error)
    return null
  }
}
