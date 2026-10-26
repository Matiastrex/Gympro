import { NextFunction, Request, Response } from "express";
import { Rol } from "@prisma/client";
import { ApiError } from "../utils/apiError";

// Va siempre después de requireAuth, que deja en req.user el rol vigente
// del usuario (releído de la base, no el que quedó guardado en el token).
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
