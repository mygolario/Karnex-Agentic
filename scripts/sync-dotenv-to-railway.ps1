# Instructions + optional Railway CLI sync from .env
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvFile = Join-Path $Root ".env"

$railwayKeys = @(
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENROUTER_API_KEY',
    'GOOGLE_GEMINI_API_KEY',
    'OXAPAY_MERCHANT_API_KEY',
    'ENVIRONMENT',
    'CORS_ORIGINS',
    'KARNEX_WEB_ORIGIN',
    'AGENT_SERVICE_INTERNAL_KEY',
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'ENCRYPTION_KEY',
    'GMAIL_MOCK_MODE'
)

$vars = @{}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        $vars[$Matches[1]] = $Matches[2].Trim().Trim('"')
    }
}

$vars['ENVIRONMENT'] = 'production'
$vars['CORS_ORIGINS'] = 'https://karnex-agentic-web.vercel.app,http://localhost:3000'
$vars['KARNEX_WEB_ORIGIN'] = 'https://karnex-agentic-web.vercel.app'

$railway = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railway) {
    Write-Host "Railway CLI not installed/logged in. Set these in Railway dashboard -> web service -> Variables:"
    foreach ($k in $railwayKeys) {
        if ($vars[$k] -and $vars[$k] -notmatch 'your_') {
            Write-Host "  $k=(set from .env)"
        }
    }
    Write-Host "SUPABASE_JWT_SECRET=(Supabase Dashboard -> API -> JWT Secret string, NOT jwks URL)"
    exit 0
}

foreach ($k in $railwayKeys) {
    $v = $vars[$k]
    if ($v -and $v -notmatch 'your_') {
        railway variables set "${k}=$v" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-Host "[OK] Railway $k" } else { Write-Host "[SKIP] Railway $k" }
    }
}
