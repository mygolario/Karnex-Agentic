# Fail if .env.example looks like it contains real secrets
$ErrorActionPreference = "Stop"
$Example = Join-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)) ".env.example"
$content = Get-Content $Example -Raw

$patterns = @(
    'sk-or-v1-',
    'sk-',
    're_',
    'phc_',
    'phx_',
    'lsv2_pt_',
    'GOCSPX-',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'BEGIN RSA PRIVATE KEY',
    'GFNSI9-'
)

$found = @()
foreach ($p in $patterns) {
    if ($content -match [regex]::Escape($p)) { $found += $p }
}

if ($found.Count -gt 0) {
    Write-Error ".env.example may contain real secrets (matched: $($found -join ', ')). Use placeholders only."
}
Write-Host ".env.example validation passed (no known secret patterns)."
