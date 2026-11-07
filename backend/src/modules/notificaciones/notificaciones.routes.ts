import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import * as notificacionesService from "./notificaciones.service";

// Bandeja personal: cada usuario solo ve y marca las notificaciones dirigidas a él.
export const notificacionesRouter = Router();
notificacionesRouter.use(requireAuth);

notificacionesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filtros = notificacionesService.listadoSchema.parse(req.query);
    res.json(await notificacionesService.listar(filtros, req.user!));
  })
);

notificacionesRouter.get(
  "/no-leidas",
  asyncHandler(async (req, res) => {
    res.json(await notificacionesService.noLeidas(req.user!));
  })
);

notificacionesRouter.post(
  "/leer-todas",
  asyncHandler(async (req, res) => {
    res.json(await notificacionesService.marcarTodas(req.user!));
  })
);

notificacionesRouter.post(
  "/:id/leer",
  asyncHandler(async (req, res) => {
    await notificacionesService.marcarLeida(Number(req.params.id), req.user!);
    res.status(204).end();
  })
);
