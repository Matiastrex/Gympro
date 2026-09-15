import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";

export function findAll(filtro?: string) {
  return prisma.empresa.findMany({
    where: filtro
      ? {
          OR: [
            { razonSocial: { contains: filtro } },
            { email: { contains: filtro } },
          ],
        }
      : undefined,
    orderBy: { razonSocial: "asc" },
  });
}

export function findById(id: number) {
  return prisma.empresa.findUnique({
    where: { id },
    include: {
      contactos: true,
      responsable: { select: { id: true, nombre: true, apellido: true } },
      oportunidades: { include: { etapa: true } },
    },
  });
}

export function create(data: Prisma.EmpresaCreateInput) {
  return prisma.empresa.create({ data });
}

export function update(id: number, data: Prisma.EmpresaUpdateInput) {
  return prisma.empresa.update({ where: { id }, data });
}

// Baja lógica: nunca se borra físicamente una empresa con historial comercial.
export function darDeBaja(id: number) {
  return prisma.empresa.update({ where: { id }, data: { estado: "INACTIVO" } });
}
