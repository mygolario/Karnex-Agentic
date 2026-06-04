import { z } from 'zod'

const envSchema = z.object({
  GMAIL_CLIENT_ID: z.string().min(1),
  GMAIL_CLIENT_SECRET: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),
  ENCRYPTION_KEY: z.string().length(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  GMAIL_MOCK_MODE: z
    .preprocess(
      (val) => typeof val === 'string' ? val === 'true' : Boolean(val),
      z.boolean()
    )
    .default(false),
  KARNEX_INTERNAL_WEBHOOK_SECRET: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
})

export const env = envSchema.parse({
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  GMAIL_MOCK_MODE: process.env.GMAIL_MOCK_MODE,
  KARNEX_INTERNAL_WEBHOOK_SECRET: process.env.KARNEX_INTERNAL_WEBHOOK_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
})
