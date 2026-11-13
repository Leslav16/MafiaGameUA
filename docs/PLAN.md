# MafiaGameUA: foundation plan

Status: proposal, waiting for approval. No code yet.

## What this is

A website where 8 to 12 people join a room, turn on their camera and microphone, and play Mafia together, with a host who runs the game. Interface in Ukrainian first, English second.

## 1. What is in the repo today

The repo has one commit and one file: `README.md` with the title `# MafiaGameUA`. There is nothing to replace or delete. This plan adds `docs/PLAN.md` only.

## 2. Recommended stack

| Layer | Pick | Why |
|---|---|---|
| Frontend | **Next.js (App Router) + React + TypeScript** | One app for the landing page, lobby, and game room. Good i18n support (`next-intl`) for UA/EN. |
| Styling and motion | **Tailwind CSS v4** with our own tokens, **Motion** (Framer Motion) for the day/night transition | Fast to build, and the tokens in section 3 map straight to CSS variables. |
| Video and audio | **LiveKit** (WebRTC SFU), starting on **LiveKit Cloud** | See comparison below. LiveKit also lets the server mute a player or turn off their camera, which is exactly what night phases need. |
| Game state | **Authoritative game server in Node + TypeScript**, using **Socket.IO** | Roles must stay secret, so the server decides everything and sends each player only what that player is allowed to know. A browser never receives other players' roles. |
| Auth and database | **Supabase** (Postgres + Auth with Google and email magic link) | Accounts, profiles, nicknames, game history and stats. Guests can play with a nickname before signing up. |
| Hosting | Frontend on **Vercel**; game server on **Fly.io** or **Railway**; video on LiveKit Cloud | Vercel cannot hold long-lived WebSocket connections, so the game server lives separately. Pick an EU region (Warsaw or Frankfurt) to stay close to Ukrainian players. |

### Video: why an SFU and not peer-to-peer

| Option | How it works | Fits Mafia? |
|---|---|---|
| Peer-to-peer mesh | Every browser sends its video to every other browser. With 10 players, each phone uploads 9 video streams. | No. Breaks down above 4 to 6 people, and many phones and home connections cannot upload that much. Free, but unplayable for a full table. |
| **SFU (LiveKit)** | Each browser uploads one stream to a server, the server forwards it to the others. | **Yes.** Works for 10 to 12 people on ordinary connections. Server-side mute and camera control for night phases. |
| Self-hosted LiveKit | Same as above, on our own server. | Later, if the cloud bill grows. Same code, so we can move without rewriting. |

### Rough monthly cost

These are estimates to check against current price pages before launch.

| Stage | What runs | Cost |
|---|---|---|
| Building and testing | Free tiers of Vercel, Supabase, LiveKit Cloud; small Fly.io machine | about $0 to $5 |
| Small launch (a few games a night) | LiveKit Cloud paid usage, Fly.io machine, Supabase free | roughly $20 to $60 |
| Growing (dozens of games a night) | Move video to self-hosted LiveKit on a dedicated server (Hetzner or similar) | roughly $50 to $150, mostly bandwidth |

Video is the only cost that grows quickly. One 10-player game for an hour is about 600 participant-minutes, and that is the number to watch.

## 3. Visual direction: "the table under one lamp"

The room is the product, so the design starts there: ten seat numbers around a table, lit from above. Day and night are the two states of everything on the page, and the change between them is the one big moment of motion.

### Color

| Name | Hex | Use |
|---|---|---|
| Night ink | `#18203A` | Night background; deep blue rather than black, so faces on video still read |
| Lamplight | `#E8A33D` | The active speaker, the current turn, primary actions |
| Card stock | `#EFE4CC` | Role cards, the voting slip, day-phase panels |
| Oxblood | `#7A1F2B` | Mafia, eliminated players, the "kill" step |
| Day haze | `#D9DDE3` | Day background |
| Smoke | `#8A8F99` | Secondary text, idle borders |

### Type

- **Oswald** (condensed, has Cyrillic) for seat numbers, phase titles, and timers. Seat numbers are how players refer to each other ("I nominate number 4"), so they are the largest type on screen, set like evidence tags pinned to each video tile.
- **Golos Text** (made for Cyrillic first, reads well in Ukrainian) for everything else.

### Layout

```
 DAY / NIGHT banner            timer  01:00
 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
 │ 1  │ │ 2  │ │ 3  │ │ 4  │ │ 5  │   video tiles, seat number pinned
 └────┘ └────┘ └────┘ └────┘ └────┘   to the top-left corner
          ┌──────────────┐
          │  HOST / table│   host tile + current action
          └──────────────┘
 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
 │ 6  │ │ 7  │ │ 8  │ │ 9  │ │ 10 │
 └────┘ └────┘ └────┘ └────┘ └────┘
 [my role card]  [nominate] [vote]  mic cam
```

On a phone the tiles become a 2-column grid with the speaker enlarged on top, and the role card is a pull-up sheet.

### Motion

- **Night falls** (signature): the lamp dims, the background moves from Day haze to Night ink, and the civilian video tiles fade to their seat numbers as the cameras turn off. About 1.2 s. This is the only automatic animation in the room.
- **Role reveal**: the card flips once when you first look at it. Hold to peek again.
- **Speaking**: a Lamplight ring around the speaker's tile, no bouncing.
- **Elimination**: the tile desaturates and an Oxblood stamp with the seat number lands on it.
- All of it turns into simple crossfades with `prefers-reduced-motion`.

## 4. MVP features

Game format for the MVP: the classic 10-player "sport Mafia" common in Ukraine (7 civilians including the Sheriff, 3 mafia including the Don) run by a human host. An automatic narrator comes later.

- **Accounts**: guest nickname, or sign in with Google or email; profile with avatar.
- **Lobby**: list of open rooms, create a room (public or private with a link), language switch UA/EN.
- **Room before the game**: seats 1 to 10, camera and mic check, host seat, "ready" toggle, host starts the game.
- **Roles**: server deals roles at random; each player sees only their own card. Mafia see each other on the first night.
- **Phases** driven by the server with timers: introduction night, day speeches (1 minute each, in seat order), nominations, voting, last word, night (mafia shot, Don's check, Sheriff's check).
- **Host tools**: start and pause the timer, give the floor, mute or unmute anyone, warnings and fouls, remove a player, end the game. The host sees all roles.
- **Night privacy**: at night the server turns off cameras and mics; mafia act by clicking a seat number, not by talking.
- **Voting**: tap a seat number; results shown after everyone votes; ties handled by the standard re-vote rule.
- **End of game**: winner screen, roles revealed, game saved to history.
- **Basic safety**: report a player, host can kick, room password.

Not in the MVP: automatic narrator, extra roles (Doctor, Maniac, etc.), ratings and leagues, spectators, tournaments, mobile apps.

## 5. Milestones

1. **Skeleton** (about 1 week): Next.js app, UA/EN, design tokens, landing page, deploy to Vercel.
2. **Video room** (about 1 week): LiveKit room with 10 seats and a host, camera and mic controls, the room layout above.
3. **Game engine** (about 2 weeks): game server with roles, phases, timers, nominations, voting, night actions, all covered by tests.
4. **Lobby and accounts** (about 1 week): Supabase auth, create and join rooms, guest play.
5. **Polish and playtest** (about 1 week): day/night motion, mobile layout, accessibility pass, a real 10-person test game, fix what breaks.
6. **Launch**: domain, monitoring, cost alerts on LiveKit.

## 6. Open questions

- Should the MVP also support a game without a human host (automatic narrator)? Recommended: later.
- Which roles beyond the classic set matter most to your players?
- Do you have a domain name in mind?
