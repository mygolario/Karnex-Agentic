# Compare required production vars (Vercel) against DEPLOY_ENV matrix
$ErrorActionPreference = "Continue"
$WebDir = Join-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)) "apps\web"
$RequiredVercel = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OXAPAY_MERCHANT_API_KEY",
    "NEXT_PUBLIC_OXAPAY_CALLBACK_URL",
    "NEXT_PUBLIC_OXAPAY_SANDBOX",
    "AGENT_SERVICE_URL",
    "NEXT_PUBLIC_APP_URL"
)

Push-Location $WebDir
try {
    $out = npx --yes vercel@latest env ls production 2>&1 | Out-String
    Write-Host "Vercel production env check"
    Write-Host "==========================="
    foreach ($name in $RequiredVercel) {
        if ($out -match [regex]::Escape($name)) {
            Write-Host "[OK] $name"
        } else {
            Write-Host "[MISSING] $name"
        }
    }
    Write-Host ""
    Write-Host "Railway: verify manually in dashboard (OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
    Write-Host "See docs/DEPLOY_ENV.md and scripts/railway-env.template"
} finally {
    Pop-Location
}
