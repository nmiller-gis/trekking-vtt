# Trekking VTT

A real-time virtual tabletop for **Star Trek Adventures 2e** (STA2e), styled with an LCARS interface. Built for small groups who want rules-accurate mechanical support without the overhead of a general-purpose VTT.

## Features

### Core Mechanics
- **Task rolls** — 2d20 pool with attribute + discipline target number, difficulty, focus, and cumulative extra-dice momentum cost (1/3/6)
- **Challenge dice** — custom die faces (1, 2, blank, effect) for damage rolls
- **Momentum pool** — shared 0–6 pool; overflow routes to GM Threat 1-for-1; named spends menu (Obtain Information, Extra Minor Action, Create Trait, Swift Action, Keep Initiative)
- **Threat pool** — GM-controlled; auto-increments from momentum overflow and complication buy-offs
- **Determination** — per-character (0–3); spend for Moment of Inspiration (reroll dice), Perfect Opportunity (auto-set one die to 1), or Special Technique
- **Complications** — roll 20s flagged with buy-off option (+2 Threat per complication)
- **Momentum decay** — triggered only on End Scene (−1), not mid-scene type changes

### Character
- Multi-step character creator (identity → attributes → disciplines → values → focuses → talents)
- Full character sheet with stress/determination pips, resistance, injuries, focuses, talents, traits
- **Values** — Invoke (spend 1 Determination) or Challenge (gain 1 Determination); used once per scene
- **Injuries** — Stun and Deadly; avoid by spending Stress, clear when treated
- **Assist action** — roll to assist another player; successful assists grant them bonus d20s on their next roll

### GM Tools
- Scene manager — type, name, description; scene traits panel; End Scene with momentum decay
- **Initiative tracker** — side-based (Players / GM); Pass Initiative; per-character acted dots; resets on round advance
- **Directives** — up to 3 mission-wide values players can Invoke or Challenge, same as personal values
- **Extended task tracker** — magnitude/difficulty/resistance; 50% and 75% breakthrough markers; contribute roll successes with optional momentum bonus
- Enemy ship manager — contacts (hidden designation) revealed on GM command; hull/shield/breach adjustments
- Player ship configurator — systems, departments, scale, hull, shields, power, weapons
- Crew tab — online status, station, stress/determination at a glance; award Determination or inflict injuries remotely
- Threat tab — quick-spend buttons with common spend reference

### Crew Stations
Six stations with pre-wired action buttons (auto-fills attribute + discipline + difficulty):

| Station | Actions |
|---|---|
| Command | Direct, Coordinate, Lay In A Course |
| Conn | Maneuver, Evasive Action, Attack Pattern |
| Tactical | Fire Weapon (per weapon), Raise Shields, Target System |
| Science | Sensor Sweep, Scan for Weakness, Analyze |
| Communications | Hail, Intercept Signals, Electronic Warfare |
| Engineering | Damage Control, Boost System, Emergency Power, Personal Repair |

### Other
- JWT auth with persistent sessions
- SQLite persistence — characters, room state, and station assignments survive server restarts
- Roll log with color-coded dice, momentum/complication breakdown, Moment of Inspiration reroll UI
- Scene traits displayed in top bar for all players; directives panel accessible without opening character sheet

---

## Docker Deployment

**First-time setup:**

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET to a long random string:
#   openssl rand -hex 32
docker compose up -d
```

**Updating the app** (rebuilds the image, data survives):

```bash
git pull
docker compose up --build -d
```

**Data persistence:**

The SQLite database lives at `./data/lcars.db` on the host. This directory is bind-mounted into the container, so accounts and campaign state survive image rebuilds.

- `docker compose up --build -d` — safe; data is untouched
- `docker compose down` — safe; data is untouched
- `docker compose down -v` — **do not use**; `-v` removes Docker-managed volumes (not applicable here, but old habit to avoid)
- Deleting `./data/lcars.db` — resets everything (accounts, rooms, all game state)

**Backing up:**

```bash
# Before a session or before a risky update:
cp data/lcars.db data/lcars.db.bak

# Restore:
cp data/lcars.db.bak data/lcars.db
# Then restart: docker compose restart
```

**Inspecting the database** (requires sqlite3):

```bash
sqlite3 data/lcars.db .tables
```

---

## Stack

| Layer | Tech |
|---|---|
| Server | Node.js, Express, Socket.IO, better-sqlite3, JWT, bcrypt |
| Client | React 18, Vite, Tailwind CSS, Zustand, Socket.IO client |
| Shared | TypeScript types + dice engine (npm workspace) |

---

## Development

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev
```

The server starts on `http://localhost:3000`. The Vite dev server proxies API and WebSocket traffic automatically.

**Build for production:**

```bash
npm run build
cd server && npm start
```

**Type-check all packages:**

```bash
npm run typecheck
```

---

## Project Structure

```
├── shared/          # Shared TypeScript types and dice engine
│   ├── types/       # GameState, Character, Ship, socket events
│   └── utils/       # diceEngine (rollTaskDice, evaluateTaskRoll, extraDiceCost, …)
├── server/
│   └── src/
│       ├── gameState.ts     # In-memory state + SQLite persistence
│       ├── socketHandlers.ts
│       ├── auth.ts
│       └── db.ts
└── client/
    └── src/
        ├── components/
        │   ├── character/   # CharacterSheet, CharacterCreator, AttributeDisciplineGrid
        │   ├── gm/          # GMControls, SceneManager, EnemyShipManager, ExtendedTaskTracker
        │   ├── layout/      # MainLayout, AuthView, DashboardView, LobbyView, StationSelector
        │   ├── shared/      # DiceRoller, RollLog, MomentumTracker, ThreatTracker, InitiativeTracker, …
        │   └── stations/    # CommandStation, ConnStation, TacticalStation, …
        ├── hooks/           # useGameState, useSocket, useRoller
        └── store/           # gameStore (Zustand), uiStore, authStore
```
