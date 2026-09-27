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
  return prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.update({ where: { id }, data });
    const estado = typeof data.estado === "string" ? data.estado : undefined;

    if (estado) {
      const nuevoEstadoDeContacto = estado === "NO_CONTACTAR" ? "INACTIVO" : estado
      await tx.contacto.updateMany({
        where: { empresaId: id },
        data: { estado: nuevoEstadoDeContacto },
      });
    }

    return empresa;
  });
}

// Baja lógica: nunca se borra físicamente una empresa con historial comercial.
// Igual que en update(), sus contactos pasan a INACTIVO (NO_CONTACTAR es una
// decisión sobre el convenio, no sobre cada empleado).
export function darDeBaja(id: number, estado: "INACTIVO" | "NO_CONTACTAR") {
  return prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.update({ where: { id }, data: { estado } });
    await tx.contacto.updateMany({ where: { empresaId: id }, data: { estado: "INACTIVO" } });
    return empresa;
  });
}
