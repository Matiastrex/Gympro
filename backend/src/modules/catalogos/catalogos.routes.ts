import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import * as catalogosService from "./catalogos.service";

// /api/catalogos/:catalogo — orígenes, motivos de pérdida y tipos de actividad.
// Leer: todos (alimentan los selects). Configurar: solo el administrador.
export const catalogosRouter = Router();
catalogosRouter.use(requireAuth);

const soloAdmin = requireRole("ADMINISTRADOR");

catalogosRouter.get(
  "/:catalogo",
  asyncHandler(async (req, res) => {
    const catalogo = catalogosService.catalogoDeRuta(req.params.catalogo);
    res.json(await catalogosService.listar(catalogo, req.query.incluirInactivos === "true", req.user!));
  })
);

catalogosRouter.post(
  "/:catalogo",
  soloAdmin,
  asyncHandler(async (req, res) => {
    const catalogo = catalogosService.catalogoDeRuta(req.params.catalogo);
    const data = catalogosService.crearSchema.parse(req.body);
    res.status(201).json(await catalogosService.crear(catalogo, data));
  })
);

catalogosRouter.post(
  "/:catalogo/reordenar",
  soloAdmin,
  asyncHandler(async (req, res) => {
    const catalogo = catalogosService.catalogoDeRuta(req.params.catalogo);
    const { ids } = catalogosService.reordenarSchema.parse(req.body);
    res.json(await catalogosService.reordenar(catalogo, ids));
  })
);

catalogosRouter.put(
  "/:catalogo/:id",
  soloAdmin,
  asyncHandler(async (req, res) => {
    const catalogo = catalogosService.catalogoDeRuta(req.params.catalogo);
    const data = catalogosService.actualizarSchema.parse(req.body);
    res.json(await catalogosService.actualizar(catalogo, Number(req.params.id), data));
  })
);
