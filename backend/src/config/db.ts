import { PrismaClient } from "@prisma/client";

// Singleton: reutilizamos una única instancia de PrismaClient en toda la app
// para no agotar el pool de conexiones de MySQL.
export const prisma = new PrismaClient();
