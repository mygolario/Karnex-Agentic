# Karnex: create/sync root .env and link apps/web for Next.js
# Usage: .\scripts\setup-env.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Example = Join-Path $Root ".env.example"
$EnvFile = Join-Path $Root ".env"
$WebEnv = Join-Path $Root "apps\web\.env"

if (-not (Test-Path $Example)) {
    Write-Error ".env.example not found at $Example"
}

if (-not (Test-Path $EnvFile)) {
    Copy-Item $Example $EnvFile
    Write-Host "Created $EnvFile from .env.example"
} else {
    Write-Host "Using existing $EnvFile"
}

function Get-EnvLineValue {
    param([string]$Name)
    foreach ($line in Get-Content $EnvFile) {
        if ($line -match "^\s*$([regex]::Escape($Name))\s*=\s*(.*)$") {
            $val = $Matches[1].Trim()
            if ($val.StartsWith('"') -and $val.EndsWith('"')) {
                $val = $val.Substring(1, $val.Length - 2)
            }
            return $val
        }
    }
    return $null
}

function Set-EnvLine {
    param([string]$Name, [string]$Value)
    $pattern = "^\s*$([regex]::Escape($Name))\s*="
    $newLine = "$Name=$Value"
    $lines = Get-Content $EnvFile
    $found = $false
    $out = foreach ($line in $lines) {
        if ($line -match $pattern) {
            $found = $true
            $newLine
        } else {
            $line
        }
    }
    if (-not $found) {
        $out = @($out) + $newLine
    }
    $out | Set-Content $EnvFile -Encoding utf8
}

$publicUrl = Get-EnvLineValue "NEXT_PUBLIC_SUPABASE_URL"
if ($publicUrl -and $publicUrl -notmatch "your_supabase") {
    $supabaseUrl = Get-EnvLineValue "SUPABASE_URL"
    if (-not $supabaseUrl -or $supabaseUrl -match "your_supabase") {
        Set-EnvLine "SUPABASE_URL" $publicUrl
        Write-Host "Synced SUPABASE_URL from NEXT_PUBLIC_SUPABASE_URL"
    }
}

# Symlink apps/web/.env -> root .env (requires admin on Windows without Developer Mode)
if (Test-Path $WebEnv) {
    $item = Get-Item $WebEnv -Force
    if ($item.LinkType -eq "SymbolicLink") {
        Write-Host "apps/web/.env symlink already exists"
    } else {
        Write-Host "apps/web/.env exists as a regular file (not overwriting)"
    }
} else {
    try {
        New-Item -ItemType SymbolicLink -Path $WebEnv -Target $EnvFile | Out-Null
        Write-Host "Created symlink apps/web/.env -> root .env"
    } catch {
        Copy-Item $EnvFile $WebEnv -Force
        Write-Host "Symlink failed; copied .env to apps/web/.env instead"
    }
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Fill secrets in $EnvFile"
Write-Host "  2. supabase link && supabase db push"
Write-Host "  3. Set Vercel/Railway vars: see docs/DEPLOY_ENV.md"
