import { prisma } from "../config/db";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyToken, JwtPayload } from "../utils/jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Además de validar el token, se relee el usuario: así desactivarlo o
// cambiarle el rol tiene efecto inmediato, sin esperar a que venza el JWT.
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized();
  }

  let payload: JwtPayload;
  try {
    payload = verifyToken(header.slice("Bearer ".length));
  } catch {
    throw ApiError.unauthorized("Sesión inválida o expirada");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.userId },
    select: { id: true, rol: true, activo: true },
  });
  if (!usuario?.activo) {
    throw ApiError.unauthorized("Tu usuario fue desactivado");
  }

  req.user = { userId: usuario.id, rol: usuario.rol };
  next();
});
