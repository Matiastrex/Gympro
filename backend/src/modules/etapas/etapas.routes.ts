import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import { prisma } from "../../config/db";

// Igual que productos: las etapas están precargadas por seed.ts. Su
// configuración desde la UI (crear/editar/reordenar etapas) es requisito
// de la Entrega Final, no del MVP.
export const etapasRouter = Router();
etapasRouter.use(requireAuth);

etapasRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const etapas = await prisma.etapa.findMany({ orderBy: { orden: "asc" } });
    res.json(etapas);
  })
);
