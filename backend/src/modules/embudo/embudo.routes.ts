import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import * as oportunidadesService from "../oportunidades/oportunidades.service";

export const embudoRouter = Router();
embudoRouter.use(requireAuth);

// Devuelve las etapas con sus oportunidades ya agrupadas, listo para pintar
// el tablero (una columna por etapa) en el frontend.
embudoRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await oportunidadesService.tableroEmbudo());
  })
);
