import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import * as etapasService from "./etapas.service";

// Embudo configurable: todos leen las etapas activas; el admin las configura.
export const etapasRouter = Router();
etapasRouter.use(requireAuth);

const soloAdmin = requireRole("ADMINISTRADOR");

etapasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await etapasService.listar(req.query.incluirInactivas === "true", req.user!));
  })
);

etapasRouter.post(
  "/",
  soloAdmin,
  asyncHandler(async (req, res) => {
    res.status(201).json(await etapasService.crear(etapasService.crearSchema.parse(req.body)));
  })
);

etapasRouter.post(
  "/reordenar",
  soloAdmin,
  asyncHandler(async (req, res) => {
    const { ids } = etapasService.reordenarSchema.parse(req.body);
    res.json(await etapasService.reordenar(ids));
  })
);

etapasRouter.put(
  "/:id",
  soloAdmin,
  asyncHandler(async (req, res) => {
    const data = etapasService.actualizarSchema.parse(req.body);
    res.json(await etapasService.actualizar(Number(req.params.id), data));
  })
);
