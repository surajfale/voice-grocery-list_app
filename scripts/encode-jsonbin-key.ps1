param(
  [switch]$WriteEnv,
  [switch]$Test
)

function Show-Usage {
  @"
Usage: .\encode-jsonbin-key.ps1 [-WriteEnv] [-Test] [raw-key]

Examples:
  .\encode-jsonbin-key.ps1              # prompts for key, prints base64
  .\encode-jsonbin-key.ps1 -WriteEnv   # write base64 to .env (backup)
  .\encode-jsonbin-key.ps1 -Test       # run curl-like test
"@
}

if ($args.Count -gt 1) { Show-Usage; exit 1 }

$raw = if ($args.Count -eq 1) { $args[0] } else { Read-Host -AsSecureString "Enter JSONBin Master Key" | ConvertFrom-SecureString }

# If Read-Host produced SecureString converted form, ask for plain input instead
if ($raw -match '^[0-9A-Fa-f\-]+$') {
  # fallback: prompt plainly
  $raw = Read-Host "Enter JSONBin Master Key (plain)"
}

[byte[]]$bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
$b64 = [Convert]::ToBase64String($bytes)
Write-Output "Base64: $b64"

$envPath = Join-Path -Path (Split-Path -Parent $MyInvocation.MyCommand.Path) -ChildPath "..\ .env" | Resolve-Path -Relative
$envFile = (Resolve-Path "$PSScriptRoot\..\.env").Path

if ($WriteEnv) {
  if (-not (Test-Path $envFile)) { Write-Error ".env not found at $envFile"; exit 2 }
  $backup = "$envFile.$((Get-Date).ToString('yyyyMMddHHmmss')).bak"
  Copy-Item $envFile $backup -Force
  Write-Output "Backed up .env to $backup"
  (Get-Content $envFile) | Where-Object { $_ -notmatch '^VITE_JSONBIN_MASTER_KEY\s*=' } | Set-Content $envFile
  if ((Get-Content $envFile) -match '^VITE_JSONBIN_MASTER_KEY_B64\s*=') {
    (Get-Content $envFile) -replace '^VITE_JSONBIN_MASTER_KEY_B64\s*=.*', "VITE_JSONBIN_MASTER_KEY_B64=$b64" | Set-Content $envFile
  } else {
    Add-Content $envFile "`nVITE_JSONBIN_MASTER_KEY_B64=$b64"
  }
  Write-Output "Updated .env with VITE_JSONBIN_MASTER_KEY_B64 (unquoted)."
}

if ($Test) {
  try {
    $resp = Invoke-RestMethod -Uri 'https://api.jsonbin.io/v3/b' -Method Post -Headers @{ 'X-Master-Key' = $raw; 'Content-Type' = 'application/json' } -Body '{"test":"connection"}' -ErrorAction Stop
    Write-Output "Success: $($resp | ConvertTo-Json -Depth 5)"
  } catch {
    Write-Error "Test failed: $($_.Exception.Message)"
  }
}
