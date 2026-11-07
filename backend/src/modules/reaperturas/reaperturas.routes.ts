import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import * as reaperturasService from "./reaperturas.service";

// Pedidos de reapertura de oportunidades perdidas. El alta vive en
// POST /api/oportunidades/:id/reapertura; acá se listan y se resuelven.
export const reaperturasRouter = Router();
reaperturasRouter.use(requireAuth);

reaperturasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { estado } = reaperturasService.listadoSchema.parse(req.query);
    res.json(await reaperturasService.listar(estado, req.user!));
  })
);

reaperturasRouter.post(
  "/:id/aprobar",
  requireRole("ADMINISTRADOR"),
  asyncHandler(async (req, res) => {
    res.json(await reaperturasService.aprobar(Number(req.params.id), req.user!));
  })
);

reaperturasRouter.post(
  "/:id/rechazar",
  requireRole("ADMINISTRADOR"),
  asyncHandler(async (req, res) => {
    const { comentario } = reaperturasService.rechazoSchema.parse(req.body);
    res.json(await reaperturasService.rechazar(Number(req.params.id), comentario, req.user!));
  })
);
