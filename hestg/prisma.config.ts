/**
 * prisma.config.ts
 * Configuration Prisma 7+ — charge .env.local pour le CLI
 */
import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";

// Charge .env.local pour que le CLI Prisma ait accès aux variables
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Pour les migrations : URL directe (session-mode, non-pooled)
    // Pour les requêtes runtime, le client utilise DATABASE_URL via l'adapter pg
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
