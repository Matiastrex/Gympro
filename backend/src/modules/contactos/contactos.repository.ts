import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";

export function findAll(filtro?: string) {
  return prisma.contacto.findMany({
    where: filtro
      ? {
          OR: [
            { nombre: { contains: filtro } },
            { apellido: { contains: filtro } },
            { email: { contains: filtro } },
          ],
        }
      : undefined,
    include: { empresa: { select: { id: true, razonSocial: true } } },
    orderBy: { apellido: "asc" },
  });
}

export function findById(id: number) {
  return prisma.contacto.findUnique({
    where: { id },
    include: {
      empresa: true,
      responsable: { select: { id: true, nombre: true, apellido: true } },
      oportunidades: { include: { etapa: true } },
      actividades: { orderBy: { fecha: "desc" } },
    },
  });
}

export function create(data: Prisma.ContactoCreateInput) {
  return prisma.contacto.create({ data });
}

export function update(id: number, data: Prisma.ContactoUpdateInput) {
  return prisma.contacto.update({ where: { id }, data });
}

export function darDeBaja(id: number) {
  return prisma.contacto.update({ where: { id }, data: { estado: "INACTIVO" } });
}
