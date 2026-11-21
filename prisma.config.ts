import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * The Prisma CLI (migrations) needs a direct connection: Neon's pooled
 * address goes through PgBouncer, which migrations don't support. The app
 * itself uses the pooled DATABASE_URL at runtime (see src/server/db.ts).
 *
 * Locally both are the same database, so DIRECT_URL can be left unset.
 * The Neon integration on Vercel names its direct address DATABASE_URL_UNPOOLED
 * (POSTGRES_URL_NON_POOLING in its older variable set); either is picked up.
 */
const directUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: directUrl,
  },
});
