# Validate root .env structure (does not print secret values)
$ErrorActionPreference = "Stop"
$EnvFile = Join-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)) ".env"
if (-not (Test-Path $EnvFile)) { Write-Error ".env not found" }

$vars = @{}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        $vars[$Matches[1]] = $Matches[2].Trim().Trim('"')
    }
}

$required = @(
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_URL',
    'OPENROUTER_API_KEY',
    'OXAPAY_MERCHANT_API_KEY',
    'AGENT_SERVICE_URL'
)

$ok = $true
foreach ($k in $required) {
    if (-not $vars[$k] -or $vars[$k] -match 'your_') {
        Write-Host "[MISSING] $k"
        $ok = $false
    } else {
        Write-Host "[OK] $k"
    }
}

if ($vars['LANGCHAIN_TRACING_V2'] -match '^lsv2_') {
    Write-Host "[FIX] LANGCHAIN_TRACING_V2 should be true or false, not an API key"
    $ok = $false
}

if ($vars['NEXT_PUBLIC_AGENT_SERVICE_URL'] -and $vars['NEXT_PUBLIC_AGENT_SERVICE_URL'] -notmatch '^https?://') {
    Write-Host "[FIX] NEXT_PUBLIC_AGENT_SERVICE_URL must include http:// or https://"
    $ok = $false
}

if ($vars['NEXT_PUBLIC_SUPABASE_ANON_KEY'] -eq $vars['SUPABASE_SERVICE_ROLE_KEY']) {
    Write-Host "[FIX] anon and service_role keys must be different"
    $ok = $false
}

if (-not $ok) { exit 1 }
Write-Host "Local .env structure validation passed."
