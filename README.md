# Realm

A web-based deck-building card game. See [PLAN.md](PLAN.md) for the roadmap.

## Setup

1. Install Postgres. On macOS, [Postgres.app](https://postgresapp.com) is the easiest: install it,
   open it, and click **Initialize**.
2. Create the app and test databases:

   ```bash
   createdb realm && createdb realm_test
   ```

3. Copy `.env.example` to `.env` and put your macOS username in both URLs.
4. Install, then create the tables (`npm install` also generates the Prisma client):

   ```bash
   npm install && npm run db:migrate
   ```

5. Run it at [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

## Scripts

| Script               | What it does                                                           |
| -------------------- | ---------------------------------------------------------------------- |
| `npm test`           | Engine and server tests. DB tests run when `TEST_DATABASE_URL` is set. |
| `npm run typecheck`  | TypeScript                                                             |
| `npm run lint`       | ESLint                                                                 |
| `npm run db:migrate` | Apply schema changes (`prisma/schema.prisma`) and make a migration     |
| `npm run db:studio`  | Browse the database                                                    |

## Layout

- `src/engine/`: the rules, pure TypeScript with no I/O. Deterministic from a seed.
- `src/server/`: game service. Stores each game as a seed plus a log of moves in Postgres, and
  rebuilds state by replaying it through the engine.
- `src/app/`: Next.js routes. `actions.ts` holds the Server Actions the UI calls.
- `src/components/realm/`: the game UI.
