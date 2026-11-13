# MafiaGameUA: foundation plan

Status: proposal, updated with the owner's answers (11 players + host, best camera and mic quality, host controls each player's camera and mic, first version runs on the owner's own computer with no paid services).

## What this is

A website where 11 players and 1 host join a room, turn on their camera and microphone, and play Mafia together. The host runs the game and controls everyone's camera and mic. Interface in Ukrainian first, English second.

## 1. What is in the repo today

The repo has one commit and one file: `README.md` with the title `# MafiaGameUA`. There is nothing to replace or delete. This plan adds `docs/PLAN.md` only.

## 2. Recommended stack

Everything in version 1 is free and open source and runs on one computer with **Docker Compose** (one command starts it all).

| Layer | Pick | Why |
|---|---|---|
| Frontend | **Next.js (App Router) + React + TypeScript** | One app for the landing page, lobby, and game room. UA/EN with `next-intl`. |
| Styling and motion | **Tailwind CSS v4** with our own tokens, **Motion** (Framer Motion) for the day/night transition | The tokens in section 3 map straight to CSS variables. |
| Video and audio | **Self-hosted LiveKit server** (open source WebRTC SFU), in Docker on your computer | Handles 12 people in a room. The server can turn any player's camera and mic off and stop them turning it back on, which is what the host controls need. Free to run. |
| Game state | **Authoritative game server in Node + TypeScript**, using **Socket.IO** | Roles stay secret: the server decides everything and sends each player only what that player may know. It also tells LiveKit to switch cameras and mics when the host acts. |
| Data | **SQLite** file for version 1 (rooms, game history) | No database server to run. Move to Postgres later if needed. |
| Accounts | **None in version 1**: players join with a nickname and the room link; the host has a room password | Fewer moving parts for the first test games. Real accounts come with online hosting. |
| Hosting | **Your computer** for version 1 | See "Running from your computer" below for what it needs. |

### Video: why an SFU and not peer-to-peer

| Option | How it works | Fits Mafia? |
|---|---|---|
| Peer-to-peer mesh | Every browser sends its video to every other browser. With 12 people, each phone uploads 11 video streams. | No. Breaks down above 4 to 6 people. |
| **SFU (LiveKit, self-hosted)** | Each browser uploads one stream to the server, the server forwards it to the others. | **Yes.** Works for 12 people and gives the host server-side control. |
| LiveKit Cloud | Same as above, run by LiveKit. | Later, when the game goes online for real. Same code, no rewrite. |

### Best camera and mic quality

- **Video:** each camera sends 720p (1080p for the host) with **simulcast**, meaning it sends a high, medium and low version at once. Each viewer gets the high version only for the person speaking or enlarged and a lighter one for small tiles. Faces stay sharp without overloading anyone's connection.
- **Audio:** Opus codec at high bitrate (about 64 kbps mono, stereo off), with echo cancellation and noise suppression on, and auto gain control off for the host so their voice stays steady.
- **Adaptive stream:** a tile that is hidden or tiny receives no high-resolution video at all.
- **Device check before the game:** each player sees their own camera, picks their mic and camera, and sees a mic level meter and a connection quality indicator.

### Running from your computer (version 1)

The one real limit is **your internet upload speed**, because your computer forwards every video to every player.

- With 12 people, the server sends about 130 video streams at once (each person watches the other 11). With simulcast (small tiles at low quality, the speaker in HD) that is roughly **40 to 70 Mbit/s of upload**. A 100 Mbit/s symmetric fiber line is enough. A typical upload of 10 to 20 Mbit/s is not, and quality will drop.
- **Players outside your home network need to reach your computer.** You need either a public IP with a few ports forwarded on your router (the LiveKit ports, mainly UDP), or a cheap VPS used only as a relay later on. Cloudflare Tunnel and ngrok do not carry UDP video, so they will not work for the video part.
- **Browsers only allow camera and mic on HTTPS.** We use a free domain (for example DuckDNS) and a free Let's Encrypt certificate. LiveKit and the web app can get certificates automatically.
- **Your computer must stay on and awake** during games. Docker Desktop runs on Windows, macOS and Linux.
- On your local network (everyone on the same Wi-Fi) none of this is needed, which is how we test first.

### Cost

| Stage | What runs | Cost |
|---|---|---|
| Version 1 | Everything on your computer, free domain and certificate | **$0** (your electricity and internet) |
| When it outgrows your upload | Same Docker setup moved to a rented server (Hetzner or similar in the EU), or LiveKit Cloud for video | roughly $10 to $60 a month |

## 3. Visual direction: "the table under one lamp"

The room is the product, so the design starts there: eleven seat numbers around a table with the host at its head, lit from above. Day and night are the two states of everything on the page, and the change between them is the one big moment of motion.

### Color

| Name | Hex | Use |
|---|---|---|
| Night ink | `#18203A` | Night background; deep blue rather than black, so faces on video still read |
| Lamplight | `#E8A33D` | The active speaker, the current turn, primary actions |
| Card stock | `#EFE4CC` | Role cards, the voting slip, day-phase panels |
| Oxblood | `#7A1F2B` | Mafia, eliminated players, the "kill" step |
| Day haze | `#D9DDE3` | Day background |
| Smoke | `#8A8F99` | Secondary text, idle borders, a muted camera |

### Type

- **Oswald** (condensed, has Cyrillic) for seat numbers, phase titles, and timers. Seat numbers are how players refer to each other ("I nominate number 4"), so they are the largest type on screen, set like evidence tags pinned to each video tile.
- **Golos Text** (made for Cyrillic first, reads well in Ukrainian) for everything else.

### Layout

```
 DAY / NIGHT banner                          timer  01:00
            ┌──────────────┐
            │     HOST     │   host tile, larger, at the head of the table
            └──────────────┘
 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
 │ 1  │ │ 2  │ │ 3  │ │ 4  │ │ 5  │ │ 6  │   seat number pinned to
 └────┘ └────┘ └────┘ └────┘ └────┘ └────┘   each tile's top-left corner
 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
 │ 7  │ │ 8  │ │ 9  │ │ 10 │ │ 11 │
 └────┘ └────┘ └────┘ └────┘ └────┘
 [my role card]  [nominate] [vote]      mic  cam
```

The speaker's tile grows while they have the floor. On a phone the tiles become a 3-column grid with the speaker enlarged on top, and the role card is a pull-up sheet.

The host sees the same table plus a control strip on each tile: camera on/off, mic on/off, give the floor, foul, kill, remove. Roles are shown to the host as a small colored mark on each tile.

### Motion

- **Night falls** (signature): the lamp dims, the background moves from Day haze to Night ink, and the player tiles fade to their seat numbers as the cameras go off. About 1.2 s. This is the only automatic animation in the room.
- **Role reveal**: the card flips once when you first look at it. Hold to peek again.
- **Speaking**: a Lamplight ring around the speaker's tile, no bouncing.
- **Killed**: the tile goes dark, the camera and mic icons cross out, and an Oxblood stamp with the seat number lands on it.
- All of it turns into simple crossfades with `prefers-reduced-motion`.

## 4. MVP features

Game format: classic sport Mafia for **11 players with a human host**. Suggested roles for 11: **3 mafia (including the Don) and 8 civilians (including the Sheriff)**. The host can change the role mix before starting.

- **Joining**: open the room link, type a nickname, take a free seat 1 to 11. The host joins with the room password and takes the host seat. Language switch UA/EN.
- **Room before the game**: camera and mic check with level meter, "ready" toggle, host starts the game when all 11 seats are filled.
- **Roles**: the server deals roles at random; each player sees only their own card. Mafia see each other on the first night. The host sees all roles.
- **Phases** driven by the server, with timers the host can pause: introduction night, day speeches (1 minute each, in seat order), nominations, voting, last word, night (mafia shot, Don's check, Sheriff's check).
- **Host control of cameras and mics** (the core feature):
  - Turn any player's camera or mic on and off. A player cannot turn back on what the host turned off.
  - Mute all / unmute all in one click, and "only the speaker's mic is on" during speeches.
  - **Kill**: when a player is killed at night or voted out, one host action marks them dead and turns their camera and mic off for the rest of the game. They can stay in the room and watch.
  - At night, all cameras and mics go off automatically, and come back on at day for living players.
- **Other host tools**: give the floor, start/pause/reset the timer, warnings and fouls, remove a player, end the game.
- **Voting**: tap a seat number; results shown after everyone votes; ties handled by the standard re-vote rule.
- **End of game**: winner screen, all roles revealed, game saved to history.

Not in the MVP: user accounts, an automatic narrator, extra roles (Doctor, Maniac, etc.), ratings, spectators, tournaments, online hosting.

## 5. Milestones

1. **Skeleton** (about 1 week): Next.js app, UA/EN, design tokens, landing page, Docker Compose that starts the web app, game server and LiveKit with one command.
2. **Video room** (about 1 week): 11 seats and a host seat, best-quality camera and mic settings, device check, the room layout above. Tested on your local network.
3. **Host controls** (about 1 week): server-side camera and mic on/off per player, mute all, kill, night auto-off.
4. **Game engine** (about 2 weeks): roles, phases, timers, nominations, voting, night actions, all covered by tests.
5. **Open to the internet** (a few days): free domain, HTTPS, router port forwarding, a test with players outside your home.
6. **Polish and playtest** (about 1 week): day/night motion, mobile layout, accessibility pass, a real 12-person test game, fix what breaks.

## 6. Open questions

- What is your home internet upload speed? (Check at speedtest.net.) It decides whether 12 people in HD works from your computer.
- Is 3 mafia + 8 civilians the role mix you want for 11 players?
- Which operating system is your computer (Windows, macOS, Linux)?
