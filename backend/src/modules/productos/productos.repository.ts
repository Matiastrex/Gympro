import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";

export function findAll(incluirInactivos: boolean) {
  return prisma.producto.findMany({
    where: incluirInactivos ? {} : { activo: true },
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });
}

export function findById(id: number) {
  return prisma.producto.findUnique({ where: { id } });
}

export function create(data: Prisma.ProductoCreateInput) {
  return prisma.producto.create({ data });
}

export function update(id: number, data: Prisma.ProductoUpdateInput) {
  return prisma.producto.update({ where: { id }, data });
}
