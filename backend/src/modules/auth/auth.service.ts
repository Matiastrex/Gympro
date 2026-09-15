import bcrypt from "bcryptjs";
import { prisma } from "../../config/db";
import { signToken } from "../../utils/jwt";
import { ApiError } from "../../utils/apiError";

export async function login(email: string, password: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.activo) {
    throw ApiError.unauthorized("Email o contraseña incorrectos");
  }

  const passwordOk = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordOk) {
    throw ApiError.unauthorized("Email o contraseña incorrectos");
  }

  const token = signToken({ userId: usuario.id, rol: usuario.rol });

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
    },
  };
}

export async function getUsuarioActual(userId: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!usuario) throw ApiError.unauthorized();
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.rol,
  };
}
