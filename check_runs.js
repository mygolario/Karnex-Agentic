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

async function check() {
  console.log('Querying latest agent runs from Supabase URL:', url);
  const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  };

  try {
    const res = await fetch(`${url}/rest/v1/agent_runs?order=created_at.desc&limit=15`, { headers });
    const runs = await res.json();
    console.log('Latest 5 Agent Runs:');
    runs.forEach(run => {
      console.log(`- ID: ${run.id}\n  Agent: ${run.agent_id}\n  Founder: ${run.founder_id}\n  Status: ${run.status}\n  Error: ${run.error_message}\n  Created: ${run.created_at}\n  Updated: ${run.updated_at}`);
    });
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

check();
