import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import * as usuariosService from "./usuarios.service";

export const usuariosRouter = Router();
usuariosRouter.use(requireAuth);

// El listado lo usan todos los roles para elegir un responsable en empresas,
// contactos y oportunidades, así que solo devuelve usuarios activos. Ver
// también los inactivos es parte de la gestión de usuarios (administrador).
usuariosRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" && req.query.q ? req.query.q : undefined;
    const incluirInactivos = req.query.incluirInactivos === "true" && req.user!.rol === "ADMINISTRADOR";
    res.json(await usuariosService.listar({ q, incluirInactivos }));
  })
);

usuariosRouter.get(
  "/:id",
  requireRole("ADMINISTRADOR"),
  asyncHandler(async (req, res) => {
    res.json(await usuariosService.obtener(Number(req.params.id)));
  })
);

usuariosRouter.post(
  "/",
  requireRole("ADMINISTRADOR"),
  asyncHandler(async (req, res) => {
    const data = usuariosService.crearUsuarioSchema.parse(req.body);
    res.status(201).json(await usuariosService.crear(data));
  })
);

// No hay DELETE: un usuario con historial (actividades, cambios de etapa) se
// desactiva con `activo: false` y deja de poder iniciar sesión.
usuariosRouter.put(
  "/:id",
  requireRole("ADMINISTRADOR"),
  asyncHandler(async (req, res) => {
    const data = usuariosService.actualizarUsuarioSchema.parse(req.body);
    res.json(await usuariosService.actualizar(Number(req.params.id), data, req.user!.userId));
  })
);
