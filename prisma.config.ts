// Prisma 7 Configuration for GenZJobs
// Database: Neon PostgreSQL (Serverless)
import "dotenv/config";
import { defineConfig } from "prisma/config";

// Tolerate a missing DATABASE_URL at config-load so `prisma generate` can run
// in CI/build envs that don't expose runtime secrets (Vercel build, etc.).
// At runtime the Neon adapter reads DATABASE_URL directly, so this placeholder
// is only ever used for offline CLI work like schema generation.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder@localhost:5432/placeholder",
  },
});
