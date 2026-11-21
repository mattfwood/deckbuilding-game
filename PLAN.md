# Realm: Project Plan

**Realm** is an original web-based deck-building card game: players start with
a small deck, buy cards from a shared market, and play through action → buy →
cleanup turns, scoring victory points at the end. Name, theme, card names, card
text and art are all our own.

> Card names are placeholders: rename them in `src/engine/cards/`.

Stack: Next.js (App Router) + React + TypeScript, Vitest, Prisma + Postgres.

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

- [x] State model: supply piles, trash, per-player deck / hand / discard / in-play
- [x] Seeded RNG + shuffle
- [x] Turn loop: action phase → buy phase → cleanup (draw 5); actions / buys / coins
- [x] Starter cards: basic treasures, basic victory cards, a curse-style card
- [x] 10 original action cards covering draw, +actions, +buys, +coins,
      trashing, gaining, one attack, one reaction
- [x] Pending-decision mechanism (can target non-current players)
- [x] End conditions (Capital pile empty, or 3 piles empty) + scoring
- [x] Unit tests, including simulated full games that check card conservation
- [x] `getPlayerView` (hides seed, RNG, other hands, deck order)

#### Placeholder card set

| Card          | Cost | Type            | Effect                                              |
| ------------- | ---- | --------------- | --------------------------------------------------- |
| Penny         | 0    | Treasure        | 1 Coin                                              |
| Crown         | 3    | Treasure        | 2 Coins                                             |
| Ingot         | 6    | Treasure        | 3 Coins                                             |
| Farm          | 2    | Victory         | 1 VP                                                |
| Town          | 5    | Victory         | 3 VP                                                |
| Capital       | 8    | Victory         | 6 VP (empty pile ends the game)                     |
| Blight        | 0    | Curse           | -1 VP                                               |
| Campfire      | 2    | Action          | +2 Actions, +1 Coin                                 |
| Shrine        | 2    | Action          | +1 Coin, trash up to 2 cards                        |
| Palisade      | 3    | Action–Reaction | +1 Card, +1 Action; reveal to block an attack       |
| Scribe        | 4    | Action          | +3 Cards, discard a card                            |
| Builder       | 4    | Action          | +1 Action, gain a card costing up to 4              |
| Raider        | 4    | Action–Attack   | +1 Card, +1 Coin; each other player discards a card |
| Tax Collector | 5    | Action          | +1 Buy, +3 Coins                                    |
| Caravan       | 5    | Action          | +2 Cards, +1 Action, +1 Buy                         |
| Alchemist     | 5    | Action          | Trash a card, gain one costing up to 3 more         |
| Warlock       | 5    | Action–Attack   | +1 Card, +1 Action; each other player gains Blight  |

Starting deck: 7 Penny + 3 Farm. Ties go to the player with fewer turns.

### Phase 2: Single-player UI

- [x] Board: market, hand, play area, deck/discard counts, game log
- [x] Prompts for pending decisions (pick cards, pick from supply, reveal yes/no)
- [x] Simple bot opponent (`src/engine/bots/bigMoney.ts`), 1-3 bots per game
- [x] Local state via `useReducer` around the engine; save to localStorage
- [x] Clicking a supply card auto-plays treasures if needed
- Mobile layout polish and card art: moved to the backlog

### Phase 3: Server-authoritative play + Prisma

- [x] Postgres (Postgres.app locally) + Prisma 7, games stored as an event log
      (`prisma/schema.prisma`): `Game` (seed, kingdom), `GamePlayer` (seat, human/bot),
      `GameAction` (seq, seat, payload)
- [x] Client sends action → server loads state (replay, plus an in-memory cache of
      replayed states) → validates → saves action → returns the player's view
- [x] `@@unique([gameId, seq])` gives optimistic concurrency; a lost race returns
      the fresh view instead of a corrupt log
- [x] Untrusted input is rebuilt field by field (`src/server/parseAction.ts`)
      before the engine sees it
- [x] Bots move on the server, one action per request, so their turns still animate
- [x] Anonymous guest cookie owns your seats (replaced by real accounts in phase 4)
- [x] Routes: `/` (new game + your games), `/game/[id]`; localStorage saving removed
- [x] Service tests against a real Postgres test database (`TEST_DATABASE_URL`)
- Snapshot table if replays get slow: moved to the backlog (a full game replays in ms today)

Original schema sketch, for reference (the real one is in `prisma/schema.prisma`):

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

Smallest working version first, in this order. Each step is playable on its own.

**4a. Lobby + polling** (done)

- [x] Games can start in a `lobby` status; seats fill as people join
- [x] Invite link `/join/<code>` with a random code separate from the game id
- [x] Host adds/removes bots and players, starts (2+ seats) or cancels; others can leave
- [x] Lobby changes lock the game row, so nobody can join after the start
- [x] `Game.version` bumps on every change; `GET /api/games/<id>?v=N` answers
      204 when nothing changed, else the caller's own snapshot
- [x] Clients poll every 1.5s while waiting on someone else (not on their own
      move, not in a background tab)
- [x] Any seated human's client drives bot moves; `stepBot` makes repeats harmless
- [x] "Friends" option on the home page; your games list shows lobbies

**4b. Deploy**

- [x] Pooled `DATABASE_URL` for the app, direct URL for migrations (`prisma.config.ts`
      reads `DIRECT_URL` / `DATABASE_URL_UNPOOLED`)
- [x] `vercel-build` runs `prisma migrate deploy` before `next build`
- [x] `/api/health`, styled error and not-found pages
- [x] Basic in-memory rate limits on creating, joining and moving
- [ ] Original card names and text before anything is public: the kingdom cards
      currently use Dominion's names as placeholders
- [ ] Push to GitHub; Vercel project + Neon via the Vercel Marketplace; first deploy
- [ ] Optional: Vercel Firewall rate-limit rule

**4c. Accounts** (once people play across devices)

- [ ] Auth.js, users stored in our own Postgres; seats move from `guestId` to `userId`
- [ ] Claim existing guest games on first sign-in

**4d. Realtime push** (only if polling feels slow)

- [ ] Pusher or PartyKit: after each accepted action, broadcast "game updated";
      clients refetch their own view. Swaps in where polling was.

**Deferred until real games show the need:** reconnect handling beyond
refetching, turn timers / AFK handling, rematch.

## Backlog (no fixed order)

Ideas to pull from after phase 4, rather than a phase with an end.

- [ ] **Bigger card pool, random 10 per game**: most replay value for the effort
- [ ] Mobile layout polish (supply is very tall on phones)
- [ ] Card art and animations
- [ ] Smarter bots
- [ ] Spectators, game history, replays (free from the event log)
- [ ] Snapshot table if replays ever get slow
