# MafiaGameUA

Mafia with cameras and microphones: 11 players and a host at one table. Ukrainian first, English second.

The plan, stack and design direction are in [docs/PLAN.md](docs/PLAN.md).

## What's here

| Folder | What it is |
|---|---|
| `apps/web` | The website (Next.js). Landing page in Ukrainian and English. Rooms come in milestone 2. |
| `apps/game-server` | The game server (Node + Socket.IO). For now it only answers a health check. It will hold roles, phases and votes. |
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
npm run dev:game   # http://localhost:4000/health
```
