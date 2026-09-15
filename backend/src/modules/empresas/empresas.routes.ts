import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import * as empresasService from "./empresas.service";

export const empresasRouter = Router();
empresasRouter.use(requireAuth);

empresasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filtro = typeof req.query.q === "string" ? req.query.q : undefined;
    res.json(await empresasService.listar(filtro));
  })
);

empresasRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await empresasService.obtener(Number(req.params.id)));
  })
);

empresasRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = empresasService.empresaSchema.parse(req.body);
    res.status(201).json(await empresasService.crear(data));
  })
);

empresasRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = empresasService.empresaSchema.parse(req.body);
    res.json(await empresasService.actualizar(Number(req.params.id), data));
  })
);

// No hay DELETE físico: se aplica baja lógica, tal como pide la consigna.
empresasRouter.post(
  "/:id/baja",
  asyncHandler(async (req, res) => {
    res.json(await empresasService.darDeBaja(Number(req.params.id)));
  })
);
