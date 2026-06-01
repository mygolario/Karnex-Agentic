import { z } from 'zod'

const envSchema = z.object({
  GMAIL_CLIENT_ID: z.string().min(1),
  GMAIL_CLIENT_SECRET: z.string().min(1),
  ENCRYPTION_KEY: z.string().length(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  GMAIL_MOCK_MODE: z.coerce.boolean().default(false),
})

export const env = envSchema.parse({
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  GMAIL_MOCK_MODE: process.env.GMAIL_MOCK_MODE,
})
