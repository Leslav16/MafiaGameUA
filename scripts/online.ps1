# Starts the game for friends on the internet: the site, the game server and LiveKit in
# Docker, plus a free Cloudflare link (https://....trycloudflare.com) to share.
# The link works only while this window is open, and it is new every time.
# Double-click start-online.bat in the repo folder to run this.

# 'Continue', because Windows PowerShell treats docker's progress output as errors otherwise.
$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ProgressPreference = 'SilentlyContinue'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Say($text, $color = 'Gray') { Write-Host $text -ForegroundColor $color }
function Fail($text) {
  Say ''
  Say $text 'Red'
  Say ''
  Read-Host 'Натисніть Enter, щоб закрити вікно'
  exit 1
}

Say ''
Say '=== Мафія: гра для друзів через інтернет ===' 'Yellow'
Say ''

# 1. Docker Desktop must be running.
Say '1/5  Перевіряю Docker Desktop...'
$dockerOk = $false
for ($i = 0; $i -lt 30; $i++) {
  docker info *> $null
  if ($LASTEXITCODE -eq 0) { $dockerOk = $true; break }
  if ($i -eq 0) {
    Say '     Docker Desktop не відповідає. Пробую його запустити, зачекайте до хвилини...' 'DarkYellow'
    $dd = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (Test-Path $dd) { Start-Process $dd }
  }
  Start-Sleep -Seconds 4
}
if (-not $dockerOk) { Fail 'Docker Desktop не запущено. Відкрийте Docker Desktop, дочекайтеся зеленого "Engine running" і запустіть цей файл знову.' }

# 2. Settings file (.env). Made automatically the first time, with a random secret.
Say '2/5  Перевіряю налаштування (.env)...'
$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $secret = ([System.BitConverter]::ToString($bytes) -replace '-', '').ToLower()
  (Get-Content (Join-Path $root '.env.example') -Raw) -replace 'change-me-to-a-long-random-secret-of-32-plus-chars', $secret |
    Set-Content $envFile -NoNewline -Encoding ascii
  Say '     Створив .env з випадковим секретом.' 'DarkGray'
}
$settings = @{}
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $settings[$Matches[1]] = $Matches[2].Trim() }
}
$cloud = [bool]$settings['LIVEKIT_PUBLIC_URL']

if ($cloud) {
  Say "     Відео йде через LiveKit Cloud ($($settings['LIVEKIT_PUBLIC_URL']))." 'DarkGray'
} else {
  # Video goes straight to this computer, so LiveKit must tell browsers our internet address.
  try {
    $ip = (Invoke-RestMethod -Uri 'https://api.ipify.org' -TimeoutSec 15).ToString().Trim()
  } catch {
    Fail 'Не вдалося дізнатися вашу інтернет-адресу. Перевірте інтернет і спробуйте ще раз.'
  }
  $env:LIVEKIT_NODE_IP = $ip
  Say "     Відео йде через цей комп'ютер. Ваша інтернет-адреса: $ip" 'DarkGray'
}

# 3. Start everything in Docker (the first time takes a few minutes).
Say '3/5  Запускаю сайт, ігровий сервер і відео (вперше це кілька хвилин)...'
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { Fail 'Docker не зміг запустити гру. Прокрутіть вікно вгору: там написано, що пішло не так.' }

$ready = $false
for ($i = 0; $i -lt 90; $i++) {
  try {
    $r = Invoke-WebRequest -Uri 'http://localhost:8080/health' -UseBasicParsing -TimeoutSec 3
    $site = Invoke-WebRequest -Uri 'http://localhost:8080/uk' -UseBasicParsing -TimeoutSec 10
    if ($r.StatusCode -eq 200 -and $site.StatusCode -eq 200) { $ready = $true; break }
  } catch { }
  Start-Sleep -Seconds 2
}
if (-not $ready) { Fail 'Сайт не відповідає на http://localhost:8080. Відкрийте Docker Desktop і подивіться, чи всі контейнери зелені.' }

# 4. The free Cloudflare link. cloudflared.exe is downloaded once into the tools folder.
Say '4/5  Відкриваю посилання для друзів (Cloudflare)...'
$tools = Join-Path $root 'tools'
$cf = Join-Path $tools 'cloudflared.exe'
if (-not (Test-Path $cf)) {
  New-Item -ItemType Directory -Force -Path $tools | Out-Null
  Say '     Завантажую cloudflared (один раз, ~60 МБ)...' 'DarkGray'
  try {
    Invoke-WebRequest -UseBasicParsing -OutFile $cf `
      -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
  } catch {
    Remove-Item $cf -ErrorAction SilentlyContinue
    Fail 'Не вдалося завантажити cloudflared. Перевірте інтернет і спробуйте ще раз.'
  }
}

# A link left over from an earlier run that did not close properly.
Get-Process cloudflared -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $cf } | Stop-Process -Force

$log = Join-Path $tools 'cloudflared.log'
Remove-Item $log -ErrorAction SilentlyContinue
# -NoNewWindow ties the link to this window: closing the window closes the link.
$tunnel = Start-Process -FilePath $cf -PassThru -NoNewWindow -RedirectStandardError $log `
  -ArgumentList @('tunnel', '--no-autoupdate', '--url', 'http://localhost:8080')

$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
  Start-Sleep -Seconds 1
  if ($tunnel.HasExited) { break }
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value }
  }
}
if (-not $url) {
  if (-not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id -Force }
  Fail "Cloudflare не дав посилання. Спробуйте ще раз за хвилину. Подробиці у файлі $log"
}

# Wait until the link actually answers (it can take a few seconds to spread).
for ($i = 0; $i -lt 30; $i++) {
  try {
    if ((Invoke-WebRequest -Uri "$url/health" -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200) { break }
  } catch { }
  Start-Sleep -Seconds 2
}

$link = "$url/uk"
try { Set-Clipboard -Value $link } catch { }

# 5. Done.
Say ''
Say '5/5  Готово! Посилання для друзів (вже скопійоване, просто вставте в чат):' 'Green'
Say ''
Say "     $link" 'Cyan'
Say ''
Say '     Посилання працює, лише поки відкрите це вікно. Наступного разу воно буде інше.' 'Yellow'
if (-not $cloud) {
  Say "     Якщо друзі бачать сайт, але не бачать відео, перевірте на роутері порти 7881 (TCP) і 7882 (UDP) (див. README)." 'DarkGray'
}
Say ''
Start-Process $link

try {
  Read-Host 'Щоб завершити гру для всіх, натисніть Enter'
} finally {
  if (-not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id -Force }
  Say 'Зупиняю гру...' 'DarkGray'
  docker compose stop *> $null
  Say 'Гру зупинено. Посилання більше не працює.' 'Green'
  Start-Sleep -Seconds 2
}
