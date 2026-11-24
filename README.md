# Starhold

A web-based deck-building game about founding a colony on a new planet. See [PLAN.md](PLAN.md) for the roadmap.

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

## Testing multiplayer locally

Each browser identity is a cookie, so open the second player on a different
host: `localhost:3000` for one player and `pat.localhost:3000` for the other
(subdomains of localhost get their own cookies and are allowed by the dev
server). Create a game with **Friends**, then open the invite link on the other host.

## Deploying (Vercel + Neon)

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new).
2. In the Vercel project, open **Storage** and add **Neon** from the Marketplace, connected to
   this project. It sets `DATABASE_URL` (pooled, used by the app) and `DATABASE_URL_UNPOOLED`
   (direct, used by migrations) for you.
3. Deploy. Vercel runs `npm run vercel-build`, which applies migrations
   (`prisma migrate deploy`) and then builds. Every push to `main` redeploys.
4. Check `https://<your-app>/api/health` returns `{"ok":true}`.

Optional: add a Vercel Firewall rate-limit rule. The app's own limits
(`src/server/rateLimit.ts`) are per server instance, so they only slow down abuse.

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
