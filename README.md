# MafiaGameUA

Mafia with cameras and microphones: 11 players and a host at one table. Ukrainian first, English second.

The plan, stack and design direction are in [docs/PLAN.md](docs/PLAN.md).

## What's here

| Folder | What it is |
|---|---|
| `apps/web` | The website (Next.js), in Ukrainian and English: landing page, create a room, the video room, and the host's controls. |
| `apps/game-server` | The game server (Node + Socket.IO). Holds seats, secret roles, day and night, the timer and fouls, and tells LiveKit whose camera and mic are allowed. |
| `livekit.yaml` | Settings for LiveKit, the free video server for cameras and microphones. |
| `docker-compose.yml` | Starts all three with one command, plus a gateway that puts them behind one address (http://localhost:8080). |
| `start-online.bat` | Double-click to play with friends over the internet: starts everything and prints a private link to share. Guide in Ukrainian below. |

## Run it on Windows 11

You need this only once:

1. Install **Docker Desktop** from docker.com and start it. When it asks, let it turn on WSL 2, then restart the computer.
2. Install **Git** from git-scm.com (the default options are fine).

Then, in **PowerShell**:

```powershell
git clone https://github.com/Leslav16/MafiaGameUA.git
cd MafiaGameUA
git checkout claude/project-thread-xghe5j   # until this branch is merged
copy .env.example .env
notepad .env                                # change the secret to a long random one, save
docker compose up -d --build
```

The first start takes a few minutes. Then open:

- http://localhost:3000 is the site
- http://localhost:4000/health is the game server, and it should show `{"ok":true}`

To stop everything: `docker compose down`. To update after new changes: `git pull`, then `docker compose up -d --build` again.

## Running a game as the host

1. Open http://localhost:3000, press **Create a room**, type your name and a host password. You land in the room.
2. Copy the **invite link** at the top and send it to the players. Each one types a nickname and picks a free seat.
3. When everyone is seated, press **Start the table**. Roles are dealt automatically (Don, 2 Mafia, Sheriff, Doctor, the rest civilians) and the game opens with the introduction night. Each player sees only their card, the mafia see each other, and you see everyone's.
4. Run the game from the **Host controls** on the right. They are grouped by purpose:

| Group | What's in it |
|---|---|
| **Game** | **Day / Night** (night turns off every player's camera and mic; day turns them back on for living players), **Town wins / Mafia wins** (ends the game and shows all roles), then **New game** (keeps players seated, clears roles, kills and fouls). |
| **Speech** | Who has the floor, **End speech**, and the timer: start, pause, reset, speech length (60 seconds by default). Everyone sees the timer. |
| **Everyone's mics and cameras** | Mute all, unmute all, all cameras off, all cameras on. |
| **Selected player** | Click a player's tile to pick them. Then: camera and mic on/off (the player can't turn back on what you turned off; the video server enforces it), **Give the floor** (only their mic stays on and the timer starts), fouls − / + (up to 4), **Kill** (asks to confirm; camera and mic stay off for the rest of the game, they keep watching) or **Undo kill**, move to another seat, remove from the room. |

You sit on tile 12, after the eleven players. Anyone, including you, can press **Change name** at the bottom of the room to change their name.

### Spectators, open tables, the night

- **Spectators.** Anyone with the link can press **Watch as a spectator**, at any time, even mid-game. They take no tile: the players see only a small 👁 count with a popup of names. Spectators see and hear the day, never roles, and see nothing at night.
- **Open tables.** A table is listed under **Tables** on the home page unless the host unticks **Show the table on the home page** (when creating it, or later at the bottom of the host panel). Others can watch it from there, or take a seat while it is still gathering players.
- **The night.** Every living player's camera stays on and every mic is off, the same for all, so nothing on screen shows who is awake. Each browser lets only the host watch its camera (and the other mafia while the mafia are awake); the video server enforces this. The host sees only the woken role's cameras.
- **Night voice.** A short spoken line when the night falls, each role is called and the morning comes, in different words each time. Players can turn it off in Settings. The Ukrainian lines are files in `apps/web/public/voice/uk/` (`night-1.mp3` and so on): replace any of them with your own recording of the same name.
- **Introductions.** Before the game, the host picks a place for the introduction round (a random one, one of 27 ready ones, or their own words). Everyone sees it above the table during the lobby and the introduction round.
- **Game record.** In the host panel's **Game log**, **Download the game record** saves a text file with the roles and everything that happened.
- Five wrong host passwords in 10 minutes from one address lock that address out of the room for a while.

If you reload the page or come back later on the same browser, you return to your seat. From another device, open the room link and choose **I'm the host** with your password.

### Testing from another device at home

1. Run `ipconfig` and find your computer's **IPv4 Address** (for example `192.168.1.20`).
2. Put it in `.env` as `LIVEKIT_NODE_IP=192.168.1.20` and run `docker compose up -d` again.
3. If Windows asks whether Docker may use the network, allow **private networks**.

## Гра з друзями через інтернет

Двічі клацніть **`start-online.bat`** у папці гри. Скрипт сам:

1. перевірить (і за потреби запустить) Docker Desktop;
2. створить `.env` з випадковим секретом, якщо його ще немає;
3. запустить сайт, ігровий сервер і відео;
4. відкриє безкоштовне захищене посилання Cloudflare на кшталт `https://slova-slova.trycloudflare.com/uk`, скопіює його і відкриє у браузері.

Вставте посилання в чат друзям. Воно **працює лише поки відкрите чорне вікно** і щоразу нове, тож знають його тільки ті, кому ви його надіслали. Щоб завершити гру для всіх, натисніть **Enter** у вікні (або просто закрийте його).

Якщо Cloudflare не відповідає (деякі провайдери його блокують), скрипт по черзі пробує запасні безкоштовні сервіси **localhost.run**, **serveo** і **pinggy**. Кожен має до 30 секунд, і на екрані видно, що відбувається. Їм потрібна вбудована у Windows програма `ssh`, нічого встановлювати не треба. Посилання pinggy діє лише 60 хвилин.

**Якщо не відповідає жоден, використайте ngrok** (безкоштовний акаунт, найнадійніше):
1. Зареєструйтеся на **dashboard.ngrok.com**.
2. Відкрийте там **Your Authtoken** і скопіюйте токен.
3. У `.env` додайте рядок `NGROK_AUTHTOKEN=ваш_токен` (без `#` на початку) і збережіть.
4. Запустіть `start-online.bat`. Тепер скрипт спершу пробує ngrok. Коли друзі вперше відкриють посилання, ngrok покаже сторінку-попередження, і на ній треба натиснути **Visit Site**.

Акаунт Cloudflare не потрібен. Сайт працює через `https`, тому браузери дозволяють камеру й мікрофон.

### Відео: через ваш комп'ютер (рекомендовано)

Сайт і гра йдуть через посилання Cloudflare, а саме відео йде напряму між друзями і вашим комп'ютером. З вашим інтернетом (500–1000 Мбіт/с на віддачу) 12 камер у найкращій якості проходять з запасом, безкоштовно і без лімітів. Для цього **один раз** треба відкрити два порти на роутері:

1. У PowerShell виконайте `ipconfig` і запишіть **IPv4 Address** комп'ютера (наприклад `192.168.1.20`).
2. Відкрийте сторінку роутера у браузері: зазвичай `http://192.168.0.1` або `http://192.168.1.1` (логін і пароль часто на наклейці знизу роутера).
3. Знайдіть розділ **Port Forwarding** (також «Переадресація портів», «Virtual Server», «NAT»). Додайте два правила на IPv4-адресу комп'ютера:
   - порт **7881**, протокол **TCP**;
   - порт **7882**, протокол **UDP**.
4. Там же, у розділі **DHCP** («Резервування адрес», «Address Reservation»), закріпіть цю адресу за комп'ютером, щоб вона не змінювалась.
5. Коли Windows спитає, чи дозволити Docker доступ до мережі, дозвольте.

Перевірка: попросіть друга відкрити посилання з телефона **через мобільний інтернет** (не через ваш Wi-Fi) і сісти за стіл. Якщо він бачить сайт, але не бачить відео:

- ще раз перевірте правила на роутері (номери портів, TCP/UDP, IPv4-адресу);
- порівняйте адресу, яку показує скрипт («Ваша інтернет-адреса»), з адресою **WAN** на сторінці роутера. Якщо вони різні, провайдер дає «сіру» адресу, і порти відкрити не вийде. Можна попросити в провайдера «білу» (статичну) IP-адресу, або перейти на LiveKit Cloud нижче.

### Відео: через LiveKit Cloud (без налаштування роутера)

Підходить, якщо порти відкрити не вдається, або щоб просто спробувати. Безкоштовний тариф має жорсткий місячний ліміт 50 ГБ відеотрафіку: для столу з 12 камер це приблизно **1–2 години гри на місяць**, потім відео перестає підключатись до 1-го числа.

1. Зареєструйтеся на **cloud.livekit.io** і створіть проєкт (безкоштовно, без картки).
2. У проєкті відкрийте **Settings → API Keys**, створіть ключ і скопіюйте **URL**, **API Key** і **API Secret**.
3. Відкрийте `.env` у Блокноті (`notepad .env`) і змініть:
   ```
   LIVEKIT_KEYS=APIключ: секрет
   LIVEKIT_URL=https://ваш-проєкт.livekit.cloud
   LIVEKIT_PUBLIC_URL=wss://ваш-проєкт.livekit.cloud
   ```
   (у двох останніх рядках приберіть `#` на початку, якщо він там є).
4. Збережіть і запустіть `start-online.bat`. Щоб повернутися до відео через комп'ютер, поставте `#` на початку рядків `LIVEKIT_URL` і `LIVEKIT_PUBLIC_URL`.

### Як це влаштовано

`docker compose` тепер також запускає **gateway** (Caddy) на `http://localhost:8080`: сайт, ігровий сервер (`/socket.io`, `/rooms`) і підключення до LiveKit (`/rtc`) за однією адресою. `start-online.bat` запускає `scripts/online.ps1`, який робить безкоштовний тунель Cloudflare (`cloudflared`, завантажується один раз у папку `tools/`) на цю адресу. Якщо сайт відкритий на порту 3000, як раніше, він іде напряму на порти 4000 і 7880.

## Developing without Docker

Needs Node.js 22.

```bash
npm install
npm run dev:web    # http://localhost:3000
npm run dev:game   # http://localhost:4000/health (needs LIVEKIT_KEYS set, and LiveKit running)
npm test           # game rules tests
```
