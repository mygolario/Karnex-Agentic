import crypto from 'crypto'

export function encryptToken(plaintext: string, secretKey: string): string {
  if (!plaintext) return ''
  const key = crypto.scryptSync(secretKey, 'karnex-salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const raw = Buffer.concat([iv, Buffer.from(encrypted, 'hex')])
  return raw.toString('base64url')
}
