import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { assertNever } from "../../utils/tipos";

/** Catálogos simples configurables por el administrador (misma forma de tabla). */
export const CATALOGOS = ["origenes", "motivos-perdida", "tipos-actividad"] as const;
export type Catalogo = (typeof CATALOGOS)[number];

export interface FilaCatalogo {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

type Cliente = Prisma.TransactionClient | typeof prisma;

// Las tres tablas tienen exactamente las mismas columnas, pero cada delegate de
// Prisma tiene su propio tipo genérico. Esta interfaz describe lo que usamos.
interface TablaCatalogo {
  findMany(args: { where?: { activo?: boolean }; orderBy: object[] }): Promise<FilaCatalogo[]>;
  findUnique(args: { where: { id: number } }): Promise<FilaCatalogo | null>;
  count(args: { where: { activo?: boolean; id?: { not: number } } }): Promise<number>;
  aggregate(args: { _max: { orden: true } }): Promise<{ _max: { orden: number | null } }>;
  create(args: { data: Omit<FilaCatalogo, "id" | "activo"> }): Promise<FilaCatalogo>;
  update(args: { where: { id: number }; data: Partial<Omit<FilaCatalogo, "id">> }): Promise<FilaCatalogo>;
}

function tabla(catalogo: Catalogo, cliente: Cliente = prisma): TablaCatalogo {
  switch (catalogo) {
    case "origenes":
      return cliente.origen as unknown as TablaCatalogo;
    case "motivos-perdida":
      return cliente.motivoPerdida as unknown as TablaCatalogo;
    case "tipos-actividad":
      return cliente.tipoActividad as unknown as TablaCatalogo;
    default:
      return assertNever(catalogo);
  }
}

// Activos primero, después por el orden configurado.
const orden = [{ activo: "desc" }, { orden: "asc" }, { nombre: "asc" }];

export function findAll(catalogo: Catalogo, incluirInactivos: boolean) {
  return tabla(catalogo).findMany({ where: incluirInactivos ? {} : { activo: true }, orderBy: orden });
}

export function findById(catalogo: Catalogo, id: number) {
  return tabla(catalogo).findUnique({ where: { id } });
}

export function contarOtrosActivos(catalogo: Catalogo, id: number) {
  return tabla(catalogo).count({ where: { activo: true, id: { not: id } } });
}

export async function siguienteOrden(catalogo: Catalogo) {
  const { _max } = await tabla(catalogo).aggregate({ _max: { orden: true } });
  return (_max.orden ?? 0) + 1;
}

export function create(catalogo: Catalogo, data: { nombre: string; orden: number }) {
  return tabla(catalogo).create({ data });
}

export function update(catalogo: Catalogo, id: number, data: Partial<Omit<FilaCatalogo, "id">>) {
  return tabla(catalogo).update({ where: { id }, data });
}

export function reordenar(catalogo: Catalogo, ids: number[]) {
  return prisma.$transaction(async (tx) => {
    const t = tabla(catalogo, tx);
    for (const [i, id] of ids.entries()) await t.update({ where: { id }, data: { orden: i + 1 } });
  });
}
