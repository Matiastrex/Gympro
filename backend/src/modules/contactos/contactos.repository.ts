import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { Paginacion, skipTake } from "../../utils/paginacion";

const includeListado = {
  empresa: { select: { id: true, razonSocial: true } },
  responsable: { select: { id: true, nombre: true, apellido: true } },
  origen: { select: { id: true, nombre: true } },
} satisfies Prisma.ContactoInclude;

const ordenListado = [{ apellido: "asc" }, { nombre: "asc" }, { id: "asc" }] satisfies Prisma.ContactoOrderByWithRelationInput[];

export function findAll(where: Prisma.ContactoWhereInput) {
  return prisma.contacto.findMany({ where, include: includeListado, orderBy: ordenListado });
}

export async function findPaginado(where: Prisma.ContactoWhereInput, paginacion: Paginacion) {
  const [items, total] = await prisma.$transaction([
    prisma.contacto.findMany({ where, include: includeListado, orderBy: ordenListado, ...skipTake(paginacion) }),
    prisma.contacto.count({ where }),
  ]);
  return { items, total };
}

export function findById(id: number) {
  return prisma.contacto.findUnique({
    where: { id },
    include: {
      empresa: true,
      responsable: { select: { id: true, nombre: true, apellido: true } },
      origen: { select: { id: true, nombre: true } },
      oportunidades: { include: { etapa: true } },
    },
  });
}

export function create(data: Prisma.ContactoCreateInput) {
  return prisma.contacto.create({ data });
}

export function update(id: number, data: Prisma.ContactoUncheckedUpdateInput) {
  return prisma.$transaction(async (tx) => {
    const contacto = await tx.contacto.update({ where: { id }, data });
    const responsableId =
      typeof data.responsableId === "number" || data.responsableId === null ? data.responsableId : undefined;

    if (contacto.oportunidadAbiertaId != null && responsableId !== undefined) {
      const oportunidad = await tx.oportunidad.update({
        where: { id: contacto.oportunidadAbiertaId },
        data: { responsableId },
        select: { empresaId: true, contactoId: true },
      });

      if (oportunidad.empresaId != null) {
        await tx.empresa.update({
          where: { id: oportunidad.empresaId },
          data: { responsableId },
        });
        await tx.contacto.updateMany({
          where: { empresaId: oportunidad.empresaId },
          data: { responsableId },
        });
      }

      if (oportunidad.contactoId != null && oportunidad.contactoId !== id) {
        await tx.contacto.update({
          where: { id: oportunidad.contactoId },
          data: { responsableId },
        });
      }
    }

    return contacto;
  });
}

export function darDeBaja(id: number, estado: "INACTIVO" | "NO_CONTACTAR") {
  return prisma.contacto.update({ where: { id }, data: { estado } });
}
