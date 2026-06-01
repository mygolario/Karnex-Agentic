# Add production URL env vars to linked Vercel project (non-secrets only)
$ErrorActionPreference = "Stop"
$WebDir = Join-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)) "apps\web"
$AppUrl = "https://karnex-agentic-web.vercel.app"
$RailwayUrl = "https://web-production-7ea9c.up.railway.app"
$OxaCallback = "$AppUrl/api/webhooks/oxapay"

Push-Location $WebDir
try {
    function Add-VercelEnv {
        param([string]$Name, [string]$Value, [string[]]$Envs = @("production", "preview"))
        foreach ($env in $Envs) {
            Write-Host "Adding $Name to $env..."
            $Value | npx --yes vercel@latest env add $Name $env 2>&1
        }
    }
    Add-VercelEnv "NEXT_PUBLIC_APP_URL" $AppUrl
    Add-VercelEnv "NEXT_PUBLIC_OXAPAY_CALLBACK_URL" $OxaCallback
    Add-VercelEnv "NEXT_PUBLIC_OXAPAY_SANDBOX" "true"
    if ($env:UPDATE_AGENT_URL -eq "1") {
        Add-VercelEnv "AGENT_SERVICE_URL" $RailwayUrl @("production")
    }
    Write-Host "Done. Redeploy: npx vercel --prod"
} finally {
    Pop-Location
}
