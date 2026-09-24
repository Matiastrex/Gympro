import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import * as oportunidadesService from "./oportunidades.service";

export const oportunidadesRouter = Router();
oportunidadesRouter.use(requireAuth);

oportunidadesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const etapaId = req.query.etapaId ? Number(req.query.etapaId) : undefined;
    const responsableId = req.query.responsableId ? Number(req.query.responsableId) : undefined;
    res.json(await oportunidadesService.listar({ etapaId, responsableId }));
  })
);

oportunidadesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await oportunidadesService.obtener(Number(req.params.id)));
  })
);

oportunidadesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = oportunidadesService.oportunidadSchema.parse(req.body);
    res.status(201).json(await oportunidadesService.crear(data, req.user!.userId));
  })
);

oportunidadesRouter.get(
  "/:id/historial",
  asyncHandler(async (req, res) => {
    res.json(await oportunidadesService.historial(Number(req.params.id)));
  })
);

oportunidadesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = oportunidadesService.oportunidadSchema.parse(req.body);
    res.json(await oportunidadesService.actualizar(Number(req.params.id), data, req.user!.userId));
  })
);

const cambiarEtapaSchema = z.object({
  etapaNuevaId: z.number().int(),
  observacion: z.string().optional(),
  motivoPerdida: z.string().optional(),
});

oportunidadesRouter.post(
  "/:id/cambiar-etapa",
  asyncHandler(async (req, res) => {
    const body = cambiarEtapaSchema.parse(req.body);
    const oportunidad = await oportunidadesService.cambiarEtapa({
      oportunidadId: Number(req.params.id),
      usuarioId: req.user!.userId,
      ...body,
    });
    res.json(oportunidad);
  })
);
