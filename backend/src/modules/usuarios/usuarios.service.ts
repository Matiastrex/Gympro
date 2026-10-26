import bcrypt from "bcryptjs";
import { Rol } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "../../utils/apiError";
import * as usuariosRepo from "./usuarios.repository";

const ROLES = ["ADMINISTRADOR", "VENDEDOR", "RESPONSABLE_COMERCIAL"] as const satisfies readonly Rol[];

const password = z.string().min(8, "La contraseña debe tener al menos 8 caracteres");

export const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  apellido: z.string().trim().min(1, "El apellido es obligatorio"),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  rol: z.enum(ROLES),
  password,
});

// En la edición la contraseña es opcional: vacía o ausente = no cambiarla.
export const actualizarUsuarioSchema = crearUsuarioSchema.extend({
  password: password.optional().or(z.literal("")),
  activo: z.boolean(),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;

export function listar(filtros: { q?: string; incluirInactivos: boolean }) {
  return usuariosRepo.findAll(filtros);
}

export async function obtener(id: number) {
  const usuario = await usuariosRepo.findById(id);
  if (!usuario) throw ApiError.notFound("Usuario no encontrado");
  return usuario;
}

async function validarEmailDisponible(email: string, idActual?: number) {
  const existente = await usuariosRepo.findByEmail(email);
  if (existente && existente.id !== idActual) {
    throw ApiError.badRequest("Ya existe un usuario con ese email");
  }
}

export async function crear({ password, ...data }: CrearUsuarioInput) {
  await validarEmailDisponible(data.email);
  const passwordHash = await bcrypt.hash(password, 10);
  return usuariosRepo.create({ ...data, passwordHash });
}

export async function actualizar(id: number, { password, ...data }: ActualizarUsuarioInput, usuarioActualId: number) {
  const usuario = await obtener(id);
  await validarEmailDisponible(data.email, id);

  // Un administrador no puede quitarse a sí mismo el acceso a la gestión de
  // usuarios: lo tiene que hacer otro administrador.
  if (id === usuarioActualId && (!data.activo || data.rol !== usuario.rol)) {
    throw ApiError.badRequest("No podés cambiar tu propio rol ni desactivar tu usuario");
  }

  // Siempre tiene que quedar al menos un administrador activo, si no nadie
  // podría volver a gestionar usuarios ni configurar el sistema.
  const dejaDeSerAdminActivo =
    usuario.rol === "ADMINISTRADOR" && usuario.activo && (data.rol !== "ADMINISTRADOR" || !data.activo);
  if (dejaDeSerAdminActivo && (await usuariosRepo.countAdministradoresActivos()) <= 1) {
    throw ApiError.badRequest("Tiene que quedar al menos un administrador activo");
  }

  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
  return usuariosRepo.update(id, { ...data, passwordHash });
}
