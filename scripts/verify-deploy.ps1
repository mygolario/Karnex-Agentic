# Smoke-check live Karnex deploy (no secrets required)
$ErrorActionPreference = "Continue"
$Frontend = "https://karnex-agentic-web.vercel.app"
$Railway = "https://web-production-7ea9c.up.railway.app"
$AgentProxy = "$Frontend/api/agent/v1/health"

function Test-Url {
    param([string]$Url, [string]$Label)
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 30
        Write-Host "[OK] $Label -> $($r.StatusCode)"
        return $true
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code) {
            Write-Host "[??] $Label -> HTTP $code"
        } else {
            Write-Host "[FAIL] $Label -> $($_.Exception.Message)"
        }
        return $false
    }
}

Write-Host "Karnex deploy verification"
Write-Host "========================"
Test-Url "$Railway/health" "Railway /health"
Test-Url "$Railway/v1/health" "Railway /v1/health"
Test-Url $Frontend "Vercel frontend"
Test-Url $AgentProxy "Vercel /api/agent proxy -> Railway"

Write-Host ""
Write-Host "Manual: sign up/login on $Frontend and test billing in OxaPay sandbox."
