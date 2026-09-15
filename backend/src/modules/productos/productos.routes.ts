import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import { prisma } from "../../config/db";

// La consigna del MVP permite que los productos/servicios estén precargados
// (ver seed.ts) y no exige todavía su gestión completa (alta/edición desde
// la UI queda para la Entrega Final).
export const productosRouter = Router();
productosRouter.use(requireAuth);

productosRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });
    res.json(productos);
  })
);
