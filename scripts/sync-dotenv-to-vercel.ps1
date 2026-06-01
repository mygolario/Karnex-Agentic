# Push selected vars from root .env to Vercel production (values not echoed)
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvFile = Join-Path $Root ".env"
$WebDir = Join-Path $Root "apps\web"

$syncKeys = @(
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OXAPAY_MERCHANT_API_KEY',
    'AGENT_SERVICE_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_OXAPAY_CALLBACK_URL',
    'NEXT_PUBLIC_OXAPAY_SANDBOX',
    'NEXT_PUBLIC_POSTHOG_KEY',
    'NEXT_PUBLIC_POSTHOG_HOST'
)

$vars = @{}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        $vars[$Matches[1]] = $Matches[2].Trim().Trim('"')
    }
}

# Production URLs for platform (override local-only values)
$prodApp = 'https://karnex-agentic-web.vercel.app'
$prodOxa = "$prodApp/api/webhooks/oxapay"
$prodRailway = 'https://web-production-7ea9c.up.railway.app'

Push-Location $WebDir
try {
    foreach ($key in $syncKeys) {
        $val = $vars[$key]
        if (-not $val -or $val -match 'your_') { continue }
        if ($key -eq 'NEXT_PUBLIC_APP_URL') { $val = $prodApp }
        if ($key -eq 'NEXT_PUBLIC_OXAPAY_CALLBACK_URL') { $val = $prodOxa }
        if ($key -eq 'AGENT_SERVICE_URL') { $val = $prodRailway }
        Write-Host "Updating Vercel production: $key"
        & npx --yes vercel@latest env rm $key production --yes 2>&1 | Out-Null
        $result = $val | & npx --yes vercel@latest env add $key production 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Failed to set ${key}: $($result | Out-String)"
        } else {
            Write-Host "  done"
        }
    }
    Write-Host "Vercel production env sync finished."
} finally {
    Pop-Location
}
