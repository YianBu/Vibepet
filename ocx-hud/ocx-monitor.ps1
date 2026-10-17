
$ErrorActionPreference = 'Continue'
$cfg = Get-Content "$env:USERPROFILE\.opencodex\config.json" -Raw | ConvertFrom-Json
function Get-Key($p) { if ($p.apiKey) { return $p.apiKey } elseif ($p.apiKeyPool -and $p.apiKeyPool.Count -gt 0) { return $p.apiKeyPool[0].key } else { return $null } }
$dsKey = Get-Key $cfg.providers.deepseek
$goKey = Get-Key $cfg.providers.'opencode-go'

"=== DeepSeek 余额 ==="
try {
  $b = Invoke-RestMethod 'https://api.deepseek.com/user/balance' -Headers @{ Authorization = "Bearer $dsKey" } -TimeoutSec 20
  foreach ($x in $b.balance_infos) { "  总余额 {0} {1}（赠送 {2} / 充值 {3}）" -f $x.total_balance, $x.currency, $x.granted_balance, $x.topped_up_balance }
} catch { "  查询失败: " + $_.Exception.Message }

""
"=== opencode-go 额度 ==="
try {
  $u = Invoke-RestMethod 'https://opencode.ai/zen/go/v1/usage' -Headers @{ Authorization = "Bearer $goKey" } -TimeoutSec 20
  $wins = @(
    @('rolling', '5小时'),
    @('weekly', '周'),
    @('monthly', '月')
  )
  foreach ($w in $wins) {
    $name = $w[0]
    $label = $w[1]
    $v = $u.usage.$name
    if ($v) {
      $flag = ''
      if ($v.status -eq 'rate-limited' -or $v.percent -ge 100) { $flag = '  <- 已限流' }
      "  {0,-6} 已用 {1,3}%   状态 {2,-13} 重置 {3}{4}" -f $label, $v.percent, $v.status, $v.resetsAt, $flag
    }
  }
} catch { "  查询失败: " + $_.Exception.Message }

""
"=== 今日本地消耗（按 provider 汇总 opencodex 记录）==="
$today = (Get-Date).Date
$agg = @{}
foreach ($line in [System.IO.File]::ReadLines("$env:USERPROFILE\.opencodex\usage.jsonl")) {
  if (-not $line) { continue }
  try { $j = $line | ConvertFrom-Json } catch { continue }
  try { $ts = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$j.timestamp).LocalDateTime } catch { continue }
  if ($ts.Date -ne $today) { continue }
  $p = [string]$j.provider
  if (-not $agg.ContainsKey($p)) { $agg[$p] = [pscustomobject]@{ n = 0; input = 0; output = 0; cached = 0; total = 0 } }
  $a = $agg[$p]
  $a.n = $a.n + 1
  if ($j.usage) {
    $a.input = $a.input + [int64]$j.usage.inputTokens
    $a.output = $a.output + [int64]$j.usage.outputTokens
    $a.cached = $a.cached + [int64]$j.usage.cachedInputTokens
  }
  $a.total = $a.total + [int64]$j.totalTokens
}
foreach ($k in ($agg.Keys | Sort-Object)) {
  $a = $agg[$k]
  "  {0,-12} 请求 {1,4}   input {2,9}   output {3,8}   缓存命中 {4,9}   合计 {5,10}" -f $k, $a.n, $a.input, $a.output, $a.cached, $a.total
}

