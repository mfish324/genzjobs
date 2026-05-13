/**
 * Prisma client for Node.js scripts
 * Uses direct connection instead of Neon serverless adapter
 */
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  // Direct connection for Node.js scripts
  // Neon serverless adapter is only for edge runtimes
});
