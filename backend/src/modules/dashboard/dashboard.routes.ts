import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import * as dashboardService from "./dashboard.service";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

// Métricas de la página principal. El alcance lo decide el service según el rol.
dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filtros = dashboardService.filtrosSchema.parse(req.query);
    res.json(await dashboardService.obtener(filtros, req.user!));
  })
);
