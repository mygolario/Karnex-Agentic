#!/usr/bin/env node
/**
 * Sync Karnex env vars from repo root .env to Vercel (production).
 * Usage: node scripts/sync-platform-envs.mjs [--vercel] [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { spawnSync } from 'child_process'
import { randomBytes } from 'crypto'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const envPath = join(repoRoot, '.env')
const dryRun = process.argv.includes('--dry-run')
const vercelOnly = !process.argv.includes('--railway-only')

const PRODUCTION = {
  NEXT_PUBLIC_APP_URL: 'https://arioai.site',
  KARNEX_APP_URL: 'https://arioai.site',
  AGENT_SERVICE_URL: 'https://web-production-7ea9c.up.railway.app',
  NEXT_PUBLIC_AGENT_SERVICE_URL: 'https://web-production-7ea9c.up.railway.app',
  NEXT_PUBLIC_OXAPAY_CALLBACK_URL: 'https://arioai.site/api/webhooks/oxapay',
  NEXT_PUBLIC_OXAPAY_SANDBOX: 'true',
  GMAIL_MOCK_MODE: 'false',
  ENVIRONMENT: 'production',
  CORS_ORIGINS: 'https://arioai.site,https://www.arioai.site',
  KARNEX_WEB_ORIGIN: 'https://arioai.site',
}

function parseEnvFile(path) {
  const env = {}
  if (!existsSync(path)) return env
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 1) continue
    const key = line.slice(0, i).trim()
    let val = line.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

function ensureWebhookSecret(env) {
  if (env.KARNEX_INTERNAL_WEBHOOK_SECRET?.trim()) return env
  const secret = randomBytes(32).toString('hex')
  env.KARNEX_INTERNAL_WEBHOOK_SECRET = secret
  if (!dryRun && existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8')
    const line = `KARNEX_INTERNAL_WEBHOOK_SECRET=${secret}`
    writeFileSync(
      envPath,
      content.includes('KARNEX_INTERNAL_WEBHOOK_SECRET=')
        ? content.replace(
            /^KARNEX_INTERNAL_WEBHOOK_SECRET=.*$/m,
            line
          )
        : `${content.trimEnd()}\n${line}\n`,
      'utf8'
    )
  }
  console.log('Generated KARNEX_INTERNAL_WEBHOOK_SECRET')
  return env
}

const VERCEL_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY',
  'RESEND_API_KEY',
  'OXAPAY_MERCHANT_API_KEY',
  'NEXT_PUBLIC_OXAPAY_CALLBACK_URL',
  'NEXT_PUBLIC_OXAPAY_SANDBOX',
  'AGENT_SERVICE_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_AGENT_SERVICE_URL',
  'GMAIL_CLIENT_ID',
  'GMAIL_CLIENT_SECRET',
  'ENCRYPTION_KEY',
  'GMAIL_MOCK_MODE',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'KARNEX_INTERNAL_WEBHOOK_SECRET',
  'KARNEX_APP_URL',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
]

const RAILWAY_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY',
  'GOOGLE_GEMINI_API_KEY',
  'AGENT_SERVICE_INTERNAL_KEY',
  'OXAPAY_MERCHANT_API_KEY',
  'ENVIRONMENT',
  'CORS_ORIGINS',
  'KARNEX_WEB_ORIGIN',
  'KARNEX_INTERNAL_WEBHOOK_SECRET',
  'KARNEX_APP_URL',
  'NEXT_PUBLIC_APP_URL',
  'RESEND_API_KEY',
  'GMAIL_CLIENT_ID',
  'GMAIL_CLIENT_SECRET',
  'ENCRYPTION_KEY',
  'GMAIL_MOCK_MODE',
  'LANGCHAIN_API_KEY',
  'LANGCHAIN_TRACING_V2',
  'LANGCHAIN_ENDPOINT',
]

function resolveValue(key, env) {
  if (Object.prototype.hasOwnProperty.call(PRODUCTION, key)) {
    return PRODUCTION[key]
  }
  const val = env[key]
  if (!val || val.includes('your_') || val.includes('_here')) return null
  return val
}

function setVercelVar(key, value) {
  if (dryRun) {
    console.log(`[dry-run] vercel production ${key}`)
    return true
  }
  const result = spawnSync(
    'npx',
    ['vercel', 'env', 'add', key, 'production', '--force'],
    {
      cwd: join(repoRoot, 'apps', 'web'),
      input: value,
      encoding: 'utf8',
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  )
  if (result.status !== 0) {
    console.error(`Failed ${key}:`, result.stderr?.trim() || result.stdout?.trim())
    return false
  }
  console.log(`Set Vercel production: ${key}`)
  return true
}

function setRailwayVar(key, value, service) {
  if (dryRun) {
    console.log(`[dry-run] railway ${service} ${key}`)
    return true
  }
  const result = spawnSync(
    'npx',
    ['@railway/cli', 'variables', 'set', `${key}=${value}`, '--service', service],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  )
  if (result.status !== 0) {
    console.error(`Failed Railway ${key}:`, result.stderr?.trim() || result.stdout?.trim())
    return false
  }
  console.log(`Set Railway ${service}: ${key}`)
  return true
}

let env = parseEnvFile(envPath)
env = ensureWebhookSecret(env)

if (env.NEXT_PUBLIC_SUPABASE_URL && !env.SUPABASE_URL) {
  env.SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
}

if (vercelOnly) {
  let ok = 0
  let skip = 0
  for (const key of VERCEL_VARS) {
    const value = resolveValue(key, env)
    if (!value) {
      console.log(`Skip Vercel (no value): ${key}`)
      skip++
      continue
    }
    if (setVercelVar(key, value)) ok++
  }
  console.log(`Vercel: set ${ok}, skipped ${skip}`)
}

if (process.argv.includes('--railway') || process.argv.includes('--all')) {
  const whoami = spawnSync('npx', ['@railway/cli', 'whoami'], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: true,
  })
  if (whoami.status !== 0) {
    console.error('Railway CLI not authenticated. Run: railway login')
    process.exit(1)
  }
  const service = process.env.RAILWAY_SERVICE || 'agent-service'
  let ok = 0
  let skip = 0
  for (const key of RAILWAY_VARS) {
    const value = resolveValue(key, env)
    if (!value) {
      console.log(`Skip Railway (no value): ${key}`)
      skip++
      continue
    }
    if (setRailwayVar(key, value, service)) ok++
  }
  console.log(`Railway: set ${ok}, skipped ${skip}`)
}
