import { execSync } from "node:child_process";
import "dotenv/config";

/** Bring the test database's schema up to date before any DB tests run. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}
