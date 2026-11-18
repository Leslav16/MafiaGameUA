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

# Is the video server answering, and does it accept our key? (Wrong keys = no cameras for anyone.)
try {
  $video = (Invoke-RestMethod -Uri 'http://localhost:4000/video-check' -TimeoutSec 20).video
} catch { $video = 'unknown' }
if ($video -eq 'ok') {
  Say '     Відеосервер відповідає, ключі підходять.' 'DarkGray'
} elseif ($video -eq 'bad_keys') {
  Fail "Відеосервер не приймає ключ і секрет з .env. Відкрийте .env (notepad .env) і перевірте: лише ОДИН рядок LIVEKIT_KEYS=, у форматі LIVEKIT_KEYS=APIключ: секрет, ключ і секрет з того самого проєкту LiveKit, що й адреса в LIVEKIT_URL."
} elseif ($video -eq 'unreachable') {
  if ($cloud) {
    Say "     УВАГА: відеосервер $($settings['LIVEKIT_URL']) не відповідає. Перевірте адресу в .env. Якщо вона правильна, його, мабуть, блокує провайдер: тоді камер не буде." 'Red'
  } else {
    Say '     УВАГА: відеосервер на цьому комп''ютері не відповідає. Відкрийте Docker Desktop і перевірте контейнер livekit.' 'Red'
  }
}

# 4. The free Cloudflare link. cloudflared.exe is downloaded once into the tools folder.
Say '4/5  Відкриваю посилання для друзів...'
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

# Links left over from an earlier run that did not close properly.
Get-Process cloudflared -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $cf } | Stop-Process -Force
Get-CimInstance Win32_Process -Filter "Name = 'ssh.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'localhost\.run|serveo\.net|pinggy\.io' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

# Starts a tunnel program and waits for its https address to appear in its output.
# -NoNewWindow ties the tunnel to this window: closing the window closes the link.
# ssh gets its own hidden window instead, so it does not read the Enter meant for this one.
function Open-Tunnel($exe, $arguments, $pattern, $outFile, $errFile, $seconds, [switch]$Hidden) {
  Remove-Item $outFile, $errFile -ErrorAction SilentlyContinue
  $window = if ($Hidden) { @{ WindowStyle = 'Hidden' } } else { @{ NoNewWindow = $true } }
  $proc = Start-Process -FilePath $exe -PassThru -ArgumentList $arguments @window `
    -RedirectStandardOutput $outFile -RedirectStandardError $errFile
  Write-Host '     ' -NoNewline
  for ($i = 0; $i -lt $seconds; $i++) {
    Start-Sleep -Seconds 1
    if ($i % 3 -eq 2) { Write-Host '.' -NoNewline -ForegroundColor DarkGray }
    foreach ($f in @($outFile, $errFile)) {
      if (Test-Path $f) {
        $m = Select-String -Path $f -Pattern $pattern | Select-Object -First 1
        if ($m) { Write-Host ' ok' -ForegroundColor Green; return @{ Process = $proc; Url = $m.Matches[0].Value } }
      }
    }
    if ($proc.HasExited) { break }
  }
  Write-Host ' немає відповіді' -ForegroundColor DarkYellow
  if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  return $null
}

$ssh = (Get-Command ssh.exe -ErrorAction SilentlyContinue).Source
$sshBase = @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=15', '-o', 'ServerAliveInterval=30',
  '-o', 'ExitOnForwardFailure=yes')
$tunnel = $null
$limitNote = $null

# 0. ngrok, if you put your free NGROK_AUTHTOKEN in .env (most reliable, needs a free account).
if ($settings['NGROK_AUTHTOKEN']) {
  $ngrok = Join-Path $tools 'ngrok.exe'
  if (-not (Test-Path $ngrok)) {
    Say '     Завантажую ngrok (один раз)...' 'DarkGray'
    try {
      $zip = Join-Path $tools 'ngrok.zip'
      Invoke-WebRequest -UseBasicParsing -OutFile $zip -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip'
      Expand-Archive -Path $zip -DestinationPath $tools -Force
      Remove-Item $zip -ErrorAction SilentlyContinue
    } catch { Say '     Не вдалося завантажити ngrok.' 'DarkYellow' }
  }
  if (Test-Path $ngrok) {
    Get-Process ngrok -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $ngrok } | Stop-Process -Force
    Say '     ngrok (до 30 секунд)...' 'DarkGray'
    $tunnel = Open-Tunnel $ngrok @('http', '8080', '--authtoken', $settings['NGROK_AUTHTOKEN'], '--log', 'stdout', '--log-format', 'logfmt') `
      'https://[a-z0-9.-]+\.ngrok(-free)?\.(app|dev|io)' (Join-Path $tools 'ngrok.out.log') (Join-Path $tools 'ngrok.err.log') 30
  }
}

# 1. Cloudflare quick tunnel: no account. Some internet providers block it.
for ($attempt = 1; $attempt -le 2 -and -not $tunnel; $attempt++) {
  Say "     Cloudflare, спроба $attempt з 2 (до 25 секунд)..." 'DarkGray'
  $tunnel = Open-Tunnel $cf @('tunnel', '--no-autoupdate', '--url', 'http://localhost:8080') `
    'https://[a-z0-9-]+\.trycloudflare\.com' (Join-Path $tools 'cloudflared.out.log') (Join-Path $tools 'cloudflared.log') 25
}

# 2-4. Free ssh tunnels through the ssh program built into Windows. ssh gets its own
# hidden window so it never reads the Enter meant for this one, and never waits forever.
if (-not $ssh -and -not $tunnel) { Say '     У Windows немає програми ssh, запасні сервіси пропускаю.' 'DarkYellow' }
if ($ssh) {
  $backups = @(
    @{ Name = 'localhost.run'; Args = @('-R', '80:localhost:8080', 'nokey@localhost.run');
       Pattern = 'https://[a-z0-9-]+\.(lhr\.life|lhr\.rocks|localhost\.run)'; Note = $null },
    @{ Name = 'serveo'; Args = @('-R', '80:localhost:8080', 'serveo.net');
       Pattern = 'https://[a-z0-9-]+\.(serveo\.net|serveousercontent\.com)'; Note = $null },
    @{ Name = 'pinggy'; Args = @('-p', '443', '-R0:localhost:8080', 'a.pinggy.io');
       Pattern = 'https://[a-z0-9-]+\.[a-z0-9.-]*pinggy\.(link|online|io)';
       Note = 'Це безкоштовне посилання pinggy діє 60 хвилин. Потім запустіть start-online.bat ще раз.' }
  )
  foreach ($b in $backups) {
    if ($tunnel) { break }
    Say "     Запасний сервіс $($b.Name) (до 30 секунд)..." 'DarkGray'
    $tunnel = Open-Tunnel $ssh ($sshBase + $b.Args) $b.Pattern `
      (Join-Path $tools "$($b.Name).out.log") (Join-Path $tools "$($b.Name).err.log") 30 -Hidden
    if ($tunnel) { $limitNote = $b.Note }
  }
}

if (-not $tunnel) {
  Fail "Жоден безкоштовний сервіс посилань зараз не відповів з вашої мережі. Надішліть у чат файли з папки $tools (ті, що закінчуються на .log). Найнадійніший вихід: безкоштовний акаунт ngrok, див. README."
}
$url = $tunnel.Url

# A new link can take up to a minute to start answering everywhere. Check briefly, never wait long.
Say '     Перевіряю посилання (до 20 секунд)...' 'DarkGray'
$answers = $false
$deadline = (Get-Date).AddSeconds(20)
while (-not $answers -and (Get-Date) -lt $deadline) {
  try {
    if ((Invoke-WebRequest -Uri "$url/health" -UseBasicParsing -TimeoutSec 4).StatusCode -eq 200) { $answers = $true }
  } catch { Start-Sleep -Seconds 2 }
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
if ($limitNote) { Say "     $limitNote" 'Yellow' }
if ($settings['NGROK_AUTHTOKEN'] -and $url -match 'ngrok') {
  Say '     ngrok спершу показує друзям сторінку-попередження: треба натиснути "Visit Site".' 'DarkGray'
}
if (-not $answers) {
  Say '     Якщо посилання одразу не відкривається, зачекайте хвилину й оновіть сторінку: нове посилання стає доступним не миттєво.' 'DarkGray'
}
if (-not $cloud) {
  Say "     Якщо друзі бачать сайт, але не бачать відео, перевірте на роутері порти 7881 (TCP) і 7882 (UDP) (див. README)." 'DarkGray'
}
Say ''
Start-Process $link

try {
  Read-Host 'Щоб завершити гру для всіх, натисніть Enter'
} finally {
  if (-not $tunnel.Process.HasExited) { Stop-Process -Id $tunnel.Process.Id -Force }
  Say 'Зупиняю гру...' 'DarkGray'
  docker compose stop *> $null
  Say 'Гру зупинено. Посилання більше не працює.' 'Green'
  Start-Sleep -Seconds 2
}
