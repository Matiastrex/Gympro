import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import * as oportunidadesService from "./oportunidades.service";
import * as reaperturasService from "../reaperturas/reaperturas.service";

export const oportunidadesRouter = Router();
oportunidadesRouter.use(requireAuth);

oportunidadesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const etapaId = req.query.etapaId ? Number(req.query.etapaId) : undefined;
    const responsableId = req.query.responsableId ? Number(req.query.responsableId) : undefined;
    res.json(await oportunidadesService.listar({ etapaId, responsableId }, req.user!));
  })
);

oportunidadesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await oportunidadesService.obtener(Number(req.params.id), req.user!));
  })
);

oportunidadesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = oportunidadesService.oportunidadSchema.parse(req.body);
    res.status(201).json(await oportunidadesService.crear(data, req.user!));
  })
);

oportunidadesRouter.get(
  "/:id/historial",
  asyncHandler(async (req, res) => {
    res.json(await oportunidadesService.historial(Number(req.params.id), req.user!));
  })
);

oportunidadesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = oportunidadesService.oportunidadSchema.parse(req.body);
    res.json(await oportunidadesService.actualizar(Number(req.params.id), data, req.user!));
  })
);

const cambiarEtapaSchema = z.object({
  etapaNuevaId: z.number().int(),
  observacion: z.string().optional(),
  motivoPerdidaId: z.number().int().positive().optional(),
  motivoPerdidaDetalle: z.string().trim().optional(),
  motivoBaja: z.string().optional(),
});

oportunidadesRouter.post(
  "/:id/cambiar-etapa",
  asyncHandler(async (req, res) => {
    const body = cambiarEtapaSchema.parse(req.body);
    const oportunidad = await oportunidadesService.cambiarEtapa({
      oportunidadId: Number(req.params.id),
      usuarioId: req.user!.userId,
      actor: req.user!,
      ...body,
    });
    res.json(oportunidad);
  })
);

// Pedido de reapertura de una oportunidad perdida (el admin la reabre directo).
oportunidadesRouter.post(
  "/:id/reapertura",
  asyncHandler(async (req, res) => {
    const data = reaperturasService.solicitudSchema.parse(req.body);
    const resultado = await reaperturasService.solicitar(Number(req.params.id), data, req.user!);
    res.status(resultado.reabierta ? 200 : 201).json(resultado);
  })
);
