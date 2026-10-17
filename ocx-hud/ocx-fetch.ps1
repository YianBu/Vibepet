
$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$cfg = Get-Content "$env:USERPROFILE\.opencodex\config.json" -Raw | ConvertFrom-Json

function Get-OcxKey($p) {
  if ($p.apiKey) { return $p.apiKey }
  if ($p.apiKeyPool -and $p.apiKeyPool.Count -gt 0) { return $p.apiKeyPool[0].key }
  return $null
}

$out = [ordered]@{
  updated   = (Get-Date).ToString('HH:mm:ss')
  ts        = [int64]([DateTimeOffset]::Now.ToUnixTimeMilliseconds())
  balance   = $null
  currency  = 'CNY'
  granted   = $null
  topped    = $null
  goRolling = $null
  goWeekly  = $null
  goMonthly = $null
  providers = @()
  total     = 0
  requests  = 0
  errors    = @()
}

try {
  $b = Invoke-RestMethod 'https://api.deepseek.com/user/balance' -Headers @{ Authorization = "Bearer $(Get-OcxKey $cfg.providers.deepseek)" } -TimeoutSec 15
  if ($b.balance_infos -and $b.balance_infos.Count -gt 0) {
    $x = $b.balance_infos[0]
    $out.balance  = [string]$x.total_balance
    $out.currency = [string]$x.currency
    $out.granted  = [string]$x.granted_balance
    $out.topped   = [string]$x.topped_up_balance
  }
} catch { $out.errors += ('deepseek: ' + $_.Exception.Message) }

try {
  $u = Invoke-RestMethod 'https://opencode.ai/zen/go/v1/usage' -Headers @{ Authorization = "Bearer $(Get-OcxKey $cfg.providers.'opencode-go')" } -TimeoutSec 15
  $out.goRolling = $u.usage.rolling
  $out.goWeekly  = $u.usage.weekly
  $out.goMonthly = $u.usage.monthly
} catch { $out.errors += ('opencode-go: ' + $_.Exception.Message) }

$today = (Get-Date).Date
$agg = @{}
foreach ($line in [System.IO.File]::ReadLines("$env:USERPROFILE\.opencodex\usage.jsonl")) {
  if (-not $line) { continue }
  $j = $null
  try { $j = $line | ConvertFrom-Json } catch { continue }
  if (-not $j) { continue }
  try { $when = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$j.timestamp).LocalDateTime } catch { continue }
  if ($when.Date -ne $today) { continue }
  $p = [string]$j.provider
  if (-not $agg.ContainsKey($p)) { $agg[$p] = [pscustomobject]@{ n = 0; input = 0; output = 0; cached = 0; total = 0 } }
  $a = $agg[$p]
  $a.n = $a.n + 1
  if ($j.usage) {
    $a.input  = $a.input  + [int64]$j.usage.inputTokens
    $a.output = $a.output + [int64]$j.usage.outputTokens
    $a.cached = $a.cached + [int64]$j.usage.cachedInputTokens
  }
  $a.total = $a.total + [int64]$j.totalTokens
}

$rows = @()
foreach ($k in ($agg.Keys | Sort-Object)) {
  $a = $agg[$k]
  $rows += [pscustomobject]@{ provider = $k; n = [int64]$a.n; total = [int64]$a.total; cached = [int64]$a.cached }
  $out.total = $out.total + [int64]$a.total
  $out.requests = $out.requests + [int64]$a.n
}
$out.providers = $rows

$out | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $root 'cache.json') -Encoding UTF8

