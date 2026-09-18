import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middlewares/auth.middleware";
import { prisma } from "../../config/db";

// Read-mostly, igual que productos/etapas: el alta/edición de usuarios es
// parte de la gestión de roles y permisos de la Entrega Final. El MVP solo
// necesita listarlos para poder asignar un responsable a empresas,
// contactos y oportunidades.
export const usuariosRouter = Router();
usuariosRouter.use(requireAuth);

usuariosRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const usuarios = await prisma.usuario.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, apellido: true, rol: true },
      orderBy: { nombre: "asc" },
    });
    res.json(usuarios);
  })
);
