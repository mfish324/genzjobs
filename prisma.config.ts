// Prisma 7 Configuration for GenZJobs
// Database: Neon PostgreSQL (Serverless)
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Pooled connection for general queries
    url: env("DATABASE_URL"),
  },
});
