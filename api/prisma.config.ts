import path from "node:path";
import { defineConfig } from "prisma/config";

// A config file disables Prisma's implicit .env loading.
try {
  process.loadEnvFile(path.join(import.meta.dirname, ".env"));
} catch {
  // Env vars may come from the environment instead (CI, containers).
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
