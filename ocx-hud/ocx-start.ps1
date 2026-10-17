
$ErrorActionPreference = 'SilentlyContinue'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = Join-Path $dir 'node.exe'
if (-not (Test-Path $node)) { $node = (Get-Command node).Source }
$log = Join-Path $dir 'start.log'
function L($m) { Add-Content -LiteralPath $log -Value ((Get-Date).ToString('HH:mm:ss') + ' ' + $m) }
$running = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue
foreach ($f in @('ocx-server.js', 'ocx-inject.js')) {
  $hit = $running | Where-Object { $_.CommandLine -like ('*' + $f + '*') }
  if (-not $hit) {
    Start-Process -FilePath $node -ArgumentList (Join-Path $dir $f) -WindowStyle Hidden
    L ('started ' + $f)
  } else {
    L ('already running ' + $f)
  }
}

