import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import * as actividadesService from "./actividades.service";

// Las actividades son hechos históricos: solo alta y consulta (sin PUT/DELETE).
export const actividadesRouter = Router();
actividadesRouter.use(requireAuth);

actividadesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filtros = actividadesService.filtrosSchema.parse(req.query);
    res.json(await actividadesService.listar(filtros, req.user!));
  })
);

// Línea de tiempo (actividades + cambios de etapa) de un contacto, empresa u oportunidad.
actividadesRouter.get(
  "/historial",
  asyncHandler(async (req, res) => {
    const ref = actividadesService.refEntidadSchema.parse(req.query);
    res.json(await actividadesService.historial(ref, req.user!));
  })
);

actividadesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = actividadesService.actividadSchema.parse(req.body);
    res.status(201).json(await actividadesService.registrar(data, req.user!));
  })
);
