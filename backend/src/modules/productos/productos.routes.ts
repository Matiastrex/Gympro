import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import * as productosService from "./productos.service";

// Todos leen los planes activos (select de oportunidades); el admin los gestiona.
export const productosRouter = Router();
productosRouter.use(requireAuth);

productosRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await productosService.listar(req.query.incluirInactivos === "true", req.user!));
  })
);

productosRouter.post(
  "/",
  requireRole("ADMINISTRADOR"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await productosService.crear(productosService.productoSchema.parse(req.body)));
  })
);

productosRouter.put(
  "/:id",
  requireRole("ADMINISTRADOR"),
  asyncHandler(async (req, res) => {
    const data = productosService.productoSchema.parse(req.body);
    res.json(await productosService.actualizar(Number(req.params.id), data));
  })
);
