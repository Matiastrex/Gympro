import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";

// Única forma en que un usuario sale de la API: nunca incluye passwordHash.
// `satisfies` valida los campos contra el modelo sin perder el tipo literal
// que necesita UsuarioGetPayload para inferir la forma exacta del resultado.
export const usuarioPublicoSelect = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  rol: true,
  activo: true,
  createdAt: true,
} satisfies Prisma.UsuarioSelect;

export type UsuarioPublico = Prisma.UsuarioGetPayload<{ select: typeof usuarioPublicoSelect }>;

export function findAll(filtros: { q?: string; incluirInactivos: boolean }) {
  return prisma.usuario.findMany({
    where: {
      activo: filtros.incluirInactivos ? undefined : true,
      OR: filtros.q
        ? [
            { nombre: { contains: filtros.q } },
            { apellido: { contains: filtros.q } },
            { email: { contains: filtros.q } },
          ]
        : undefined,
    },
    select: usuarioPublicoSelect,
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });
}

export function findById(id: number) {
  return prisma.usuario.findUnique({ where: { id }, select: usuarioPublicoSelect });
}

export function findByEmail(email: string) {
  return prisma.usuario.findUnique({ where: { email }, select: usuarioPublicoSelect });
}

export function countAdministradoresActivos() {
  return prisma.usuario.count({ where: { rol: "ADMINISTRADOR", activo: true } });
}

export function create(data: Prisma.UsuarioCreateInput) {
  return prisma.usuario.create({ data, select: usuarioPublicoSelect });
}

export function update(id: number, data: Prisma.UsuarioUpdateInput) {
  return prisma.usuario.update({ where: { id }, data, select: usuarioPublicoSelect });
}
