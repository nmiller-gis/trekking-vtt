# LCARS VTT — Session Handoff

A browser-based virtual tabletop for **Star Trek Adventures 2e**, styled as an LCARS interface. Built for a TNG-era campaign where players man specific bridge stations.

---

## Current State

All three implementation phases are **complete**. The app is fully playable and deployed via Docker.

### What's implemented

**STA2e Rules (Phase 1)**
- Extra dice cost: cumulative 1/3/6 momentum, deducted atomically server-side inside the `dice-roll` handler
- Momentum decay: only on End Scene (−1), not on mid-scene type changes
- Momentum overflow: excess beyond 6 routes to GM Threat pool 1-for-1
- Complication buy-off: players pay +2 Threat per complication to the GM pool

**Core Mechanics (Phase 2)**
- Determination spending: Moment of Inspiration (reroll dice), Perfect Opportunity (auto-set one die to 1), Special Technique
- Values: Invoke (spend 1 Det) / Challenge (gain 1 Det), marked invoked/challenged
- Directives: up to 3 mission-wide values, same invoke/challenge economy as personal values
- Momentum named spends: Obtain Information, Extra Minor Action, Create Trait, Swift Action, Keep Initiative
- Injury tracker: Stun / Deadly; avoid by spending Stress; treat to remove
- Extended task tracker: magnitude/difficulty/resistance, 50%/75% breakthrough markers, contribute roll successes + momentum bonus

**Session Play Features (Phase 3)**
- Scene traits: "Create Trait" spend now persists to `Scene.traits[]`; shown as chips in top bar and SceneManager (GM can remove)
- Initiative tracker: side-based (Players / GM); Pass Initiative button; per-character acted dots; resets on Advance Round; GM starts/ends from SceneManager
- Assist action: "Rolling to Assist" mode in DiceRoller selects a target; successful assist grants target player bonus d20s via gold banner in their roller
- Player directives widget: "Dir" button in top bar opens an inline panel — no need to open character sheet
- GM injury prompt: "Inflict Injury" button per character in GM Crew tab

**Deployment**
- Multi-stage `Dockerfile` + `docker-compose.yml` with SQLite volume
- GitHub Actions workflow publishes to `ghcr.io/nmiller-gis/trekking-vtt` on every push to `main`
- Health check endpoint at `GET /api/health`

---

## Stack

```
lcars-vtt/                  ← npm workspace root
├── shared/                 ← compiled first; types + dice engine
│   ├── types/
│   │   ├── character.ts    ← Character, Injury, Value, Talent
│   │   ├── game.ts         ← GameState, Scene, InitiativeState, Directive, ExtendedTask, RollResult
│   │   ├── events.ts       ← ClientToServerEvents, ServerToClientEvents, DiceRollParams
│   │   └── ship.ts         ← Ship, EnemyShip
│   └── utils/diceEngine.ts ← rollTaskDice, evaluateTaskRoll, rollChallengeDice, extraDiceCost
├── server/src/
│   ├── index.ts            ← Express + Socket.IO setup, static file serving, /api/health
│   ├── gameState.ts        ← GameStateManager class — all state mutations, SQLite persistence
│   ├── socketHandlers.ts   ← registerHandlers() — all C→S event handlers
│   ├── auth.ts             ← JWT sign/verify, requireAuth middleware
│   ├── db.ts               ← better-sqlite3 schema + prepared queries
│   └── routes/
│       ├── auth.ts         ← POST /api/auth/register, /api/auth/login
│       └── rooms.ts        ← GET /api/rooms (list GM's rooms)
└── client/src/
    ├── store/
    │   ├── gameStore.ts    ← Zustand — full GameState + apply* reducers for each S→C event
    │   ├── uiStore.ts      ← Zustand — view, panels, pendingPerfectOpportunity, pendingAssist, etc.
    │   └── authStore.ts    ← Zustand — JWT token, persist to localStorage
    ├── hooks/
    │   ├── useGameState.ts ← Selector hooks: useMomentum, useScene, useInitiative, useDirectives, etc.
    │   ├── useSocket.ts    ← Singleton socket + registerListeners() wiring S→C → store
    │   └── useRoller.ts    ← rollTask / rollChallenge helpers
    └── components/
        ├── layout/MainLayout.tsx       ← Top bar (scene, traits, initiative, momentum, threat, panels)
        ├── character/CharacterSheet.tsx
        ├── character/CharacterCreator.tsx  ← 7-step wizard
        ├── gm/GMControls.tsx           ← Tabbed: Scene, Enemies, Ship, Crew, Threat, Directives, Tasks
        ├── gm/SceneManager.tsx         ← Scene type, traits, initiative start/end, end scene
        ├── gm/ExtendedTaskTracker.tsx
        ├── shared/DiceRoller.tsx       ← Task + challenge modes, assist mode, perfect opportunity
        ├── shared/RollLog.tsx          ← Roll history + Moment of Inspiration reroll UI
        ├── shared/InitiativeTracker.tsx
        ├── shared/MomentumTracker.tsx  ← Pool + named spends menu
        └── stations/                   ← CommandStation, ConnStation, TacticalStation, ScienceStation,
                                          CommunicationsStation, EngineeringStation
```

---

## Key Architectural Rules

- **Server is authoritative** — all dice rolls, momentum changes, and character mutations happen server-side. Never update game state client-side without an ack from the server.
- **`gameState.ts` owns all mutations** — add new state methods there, wire them in `socketHandlers.ts`. Keep handlers thin.
- **`shared/types/` is the contract** — change types there first, then server, then client. Build order: `shared → server → client`.
- **`scene-changed` S→C event reuses existing Scene** — scene traits and initiative live inside Scene, so any scene update broadcasts everything. No separate events needed.
- **Persistent assists** live in a module-level `Map` in `socketHandlers.ts` (not in GameState) — they're transient and don't need to survive restarts.
- **SQLite persistence** is debounced 150ms. Characters are also stored per-member in `room_members.character_json` so they survive server restarts.

---

## Dev Workflow

```bash
npm install          # from repo root
npm run dev          # server :3001 + client :5173 (Vite proxies /api and /socket.io)
npm run build        # shared → server → client; must pass before committing
npm run typecheck    # type-check only, no emit
```

```bash
# Docker (uses published image from GHCR)
cp .env.example .env  # set JWT_SECRET
docker compose up -d

# Docker (build locally)
docker compose up -d --build
```

---

## What Could Come Next

These are logical next features, roughly in priority order:

1. **NPC / supporting character sheets** — GM-controlled characters with full stat blocks that can roll dice from the GM panel. Currently the GM can only roll from station views.

2. **Personal combat** — The station actions are all ship-combat oriented. Personal combat (opposed checks, melee, ranged, resistance application) is unimplemented.

3. **Resistance application to incoming damage** — `character.resistance` is displayed but never mechanically deducted from stress when taking damage.

4. **Ship power management** — `ship.power` is tracked but never spent on actions. Boost System / weapons are supposed to cost power.

5. **Scene traits — player creation** — Currently only GMs can see the remove button. Players can create traits via momentum spend but can't remove them. Minor UX gap.

6. **Active effects / conditions** — No status tracking (stunned, disabled system, etc.)

7. **Character advancement** — No XP or milestone system between sessions.

8. **Campaign persistence** — Rooms expire based on `last_activity`. No explicit campaign/session archiving.

---

## Repo & Deployment

- **GitHub:** `https://github.com/nmiller-gis/trekking-vtt`
- **GHCR image:** `ghcr.io/nmiller-gis/trekking-vtt:latest` (built on every push to main)
- **SQLite volume:** `/app/server/data/lcars.db` — mount this in production
- **Required env:** `JWT_SECRET` (everything else has safe defaults)
