const fs = require('fs');
const path = require('path');

// Manually parse .env file
const envPath = path.join(__dirname, '.env');
const envConfig = fs.readFileSync(envPath, 'utf-8');
const env = {};
envConfig.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing URL or service key in env!');
  process.exit(1);
}

const userId = '6d6716c4-8fe7-4efb-b904-387512be5c83';

async function check() {
  console.log('Using Supabase URL:', url);
  const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Fetch founder
    const founderRes = await fetch(`${url}/rest/v1/founders?id=eq.${userId}`, { headers });
    const founder = await founderRes.json();
    console.log('Founder Record:', founder);

    // 2. Fetch startups
    const startupsRes = await fetch(`${url}/rest/v1/startups?founder_id=eq.${userId}`, { headers });
    const startups = await startupsRes.json();
    console.log('Startups Records:', startups);

    // 3. Fetch subscriptions
    const subRes = await fetch(`${url}/rest/v1/subscriptions?founder_id=eq.${userId}`, { headers });
    const sub = await subRes.json();
    console.log('Subscription Records:', sub);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

check();
