import { NextFunction, Request, Response } from "express";
import { Rol } from "@prisma/client";
import { ApiError } from "../utils/apiError";

// Preparado para la Entrega Final, donde sí se exige diferenciar
// Administrador / Vendedor / Responsable comercial. En el MVP el único
// usuario cargado es ADMINISTRADOR, así que este guard no bloquea nada
// todavía, pero las rutas ya pueden empezar a declarar qué roles permiten.
export function requireRole(...rolesPermitidos: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    if (!rolesPermitidos.includes(req.user.rol)) {
      throw ApiError.forbidden();
    }
    next();
  };
}
