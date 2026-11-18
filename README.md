# MafiaGameUA

Mafia with cameras and microphones: 11 players and a host at one table. Ukrainian first, English second.

The plan, stack and design direction are in [docs/PLAN.md](docs/PLAN.md).

## What's here

| Folder | What it is |
|---|---|
| `apps/web` | The website (Next.js), in Ukrainian and English: landing page, create a room, the video room, and the host's controls. |
| `apps/game-server` | The game server (Node + Socket.IO). Holds seats, secret roles, day and night, the timer and fouls, and tells LiveKit whose camera and mic are allowed. |
| `livekit.yaml` | Settings for LiveKit, the free video server for cameras and microphones. |
| `docker-compose.yml` | Starts all three with one command. |

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
3. Use the **Host controls** on the right and the buttons under each player:

| Control | What it does |
|---|---|
| **Camera / Mic** under a player | Turns that player's camera or mic off or back on. The player can't turn back on what you turned off; the video server enforces it, not just the page. |
| **Mute all / Unmute all** | Every player's mic at once. |
| **Floor** under a player | Only that player's mic stays on, and the speech timer starts. **End speech** gives everyone their mic back. |
| **Day / Night** | Night turns off every player's camera and mic. Day turns them back on for living players. |
| **Deal roles** | Deals at random: the Don plus the other mafia, a Sheriff if ticked, and civilians. Each player sees only their card; the mafia see each other; you see everyone's. |
| **Kill** (asks to confirm) | Marks the player killed: camera and mic stay off for the rest of the game, but they keep watching. **Undo kill** fixes a misclick. |
| **− F +** | Removes or adds a foul (up to 4), shown on the player's tile. |
| **Timer** | Start, pause, reset, and set the speech length (60 seconds by default). Everyone sees it. |
| **More → Move to seat / Remove from room** | Swaps or moves a player to another seat, or removes them (they can't come back with the same link session). |
| **Town wins / Mafia wins** | Ends the game and shows everyone's roles. **New game** keeps the players seated and clears roles, kills and fouls. |

If you reload the page or come back later on the same browser, you return to your seat. From another device, open the room link and choose **I'm the host** with your password.

### Testing from another device at home (later, with rooms)

1. Run `ipconfig` and find your computer's **IPv4 Address** (for example `192.168.1.20`).
2. Put it in `.env` as `LIVEKIT_NODE_IP=192.168.1.20` and run `docker compose up -d` again.
3. If Windows asks whether Docker may use the network, allow **private networks**.

Opening the game to players outside your home (router ports, a free domain and HTTPS) is milestone 5 and has its own guide then.

## Developing without Docker

Needs Node.js 22.

```bash
npm install
npm run dev:web    # http://localhost:3000
npm run dev:game   # http://localhost:4000/health (needs LIVEKIT_KEYS set, and LiveKit running)
npm test           # game rules tests
```
