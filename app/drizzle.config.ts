import { defineConfig } from "drizzle-kit";
import { join } from "node:path";

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url:
      process.env["DATABASE_URL"] ||
      `file:${join(process.cwd(), "data", "db.sqlite")}`,
  },
});
