# Deck-Builder Game: Project Plan

An **original** web-based deck-building card game: players start with a small
deck, buy cards from a shared market, and play through action → buy → cleanup
turns, scoring victory points at the end. Name, theme, card names, card text
and art are all our own.

> Game name / theme: **TBD**

Stack: Next.js (App Router) + React + TypeScript, Vitest, Prisma + Postgres
(phase 3+).

## Core idea: a pure rules engine first

All game rules live in a plain TypeScript module with no React, network, or
database dependencies. Single-player runs it in the browser; multiplayer runs
the exact same code on the server.

```
src/
  engine/            # pure TS, no React, no I/O
    types.ts         # GameState, PlayerState, Card, Action, Decision
    cards/           # card definitions (data + effect functions)
    reducer.ts       # applyAction(state, action) => newState
    rng.ts           # seeded RNG (reproducible shuffles)
    view.ts          # getPlayerView(state, playerId): hides other players' hands/decks
    bots/            # simple AI opponents
  app/               # Next.js App Router UI
  server/            # game service, persistence, realtime (phase 3+)
prisma/
```

### Engine rules

- **Deterministic.** The seed lives in state. A game can be rebuilt from
  `seed + list of actions`, which gives replays, debugging, syncing, and saving.
- **Every action is validated.** `applyAction` rejects illegal moves. The
  server never trusts the client.
- **Interactive cards use a pending decision.** Effects like "choose up to 3
  cards to discard" or "each other player reveals…" pause the engine with
  `pendingDecision: { playerId, kind, options }`. The engine resumes when that
  player answers. This is what makes attacks and reactions work across players.
- **Per-player views.** Clients only ever receive `getPlayerView(...)`, never
  the full state.

## Phases

### Phase 0: Setup

- [x] Next.js (App Router) + TypeScript + Tailwind
- [x] git repo
- [x] Vitest for engine tests
- [x] ESLint + Prettier
- [x] `src/engine/` folder with a smoke test

### Phase 1: Engine

- [ ] State model: supply piles, trash, per-player deck / hand / discard / in-play
- [ ] Seeded RNG + shuffle
- [ ] Turn loop: action phase → buy phase → cleanup (draw 5); actions / buys / coins
- [ ] Starter cards: basic treasures, basic victory cards, a curse-style card
- [ ] ~10 original action cards covering draw, +actions, +buys, +coins,
      trashing, gaining, one attack, one reaction
- [ ] Pending-decision mechanism
- [ ] End conditions (top victory pile empty, or 3 piles empty) + scoring
- [ ] Thorough unit tests

### Phase 2: Single-player UI

- [ ] Board: market, hand, play area, deck/discard counts, game log
- [ ] Prompts for pending decisions (pick cards, yes/no)
- [ ] Simple bot opponent (fixed buy-priority, "big money" style)
- [ ] Local state via `useReducer` around the engine; save to localStorage

### Phase 3: Server-authoritative play + Prisma

- [ ] Postgres + Prisma, games stored as an event log (schema below)
- [ ] Client sends action → server loads state (replay or cached snapshot) →
      validates → saves action → returns the player's view
- [ ] `@@unique([gameId, seq])` gives optimistic concurrency

```prisma
model Game {
  id        String   @id @default(cuid())
  seed      String
  status    String   // lobby | active | finished
  config    Json     // which market cards are in play, settings
  players   GamePlayer[]
  actions   GameAction[]
  createdAt DateTime @default(now())
}

model GamePlayer {
  id     String @id @default(cuid())
  gameId String
  userId String
  seat   Int
  game   Game   @relation(fields: [gameId], references: [id])
}

model GameAction {
  id       String @id @default(cuid())
  gameId   String
  seq      Int
  playerId String
  payload  Json
  game     Game   @relation(fields: [gameId], references: [id])

  @@unique([gameId, seq])
}
```

### Phase 4: Multiplayer

- [ ] Auth (Auth.js or Clerk)
- [ ] Lobby: create or join by code, seat assignment, start game
- [ ] Realtime push. Serverless Next.js doesn't hold websockets, so choose:
  - **Hosted realtime** (Pusher / Ably / PartyKit): easiest on Vercel (recommended)
  - Custom Node server + Socket.IO: needs a long-running host (Fly, Railway)
  - SSE / polling: fine for a prototype, since turn-based play tolerates latency
- [ ] After each accepted action, broadcast "game updated"; each client fetches
      its own view (never broadcast full state, which leaks hidden info)
- [ ] Reconnects, turn timers / AFK handling, rematch

### Phase 5: Polish

- [ ] Card art and animations
- [ ] Bigger, more varied card pool
- [ ] Smarter bots
- [ ] Spectators, game history, replays (free from the event log)
