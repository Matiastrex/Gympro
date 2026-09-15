import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import * as contactosService from "./contactos.service";

export const contactosRouter = Router();
contactosRouter.use(requireAuth);

contactosRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filtro = typeof req.query.q === "string" ? req.query.q : undefined;
    res.json(await contactosService.listar(filtro));
  })
);

contactosRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await contactosService.obtener(Number(req.params.id)));
  })
);

contactosRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = contactosService.contactoSchema.parse(req.body);
    res.status(201).json(await contactosService.crear(data));
  })
);

contactosRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = contactosService.contactoSchema.parse(req.body);
    res.json(await contactosService.actualizar(Number(req.params.id), data));
  })
);

contactosRouter.post(
  "/:id/baja",
  asyncHandler(async (req, res) => {
    res.json(await contactosService.darDeBaja(Number(req.params.id)));
  })
);
