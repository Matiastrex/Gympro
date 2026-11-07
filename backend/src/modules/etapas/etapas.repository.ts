import { Prisma, TipoEtapa } from "@prisma/client";
import { prisma } from "../../config/db";

export function findAll(incluirInactivas: boolean) {
  return prisma.etapa.findMany({
    where: incluirInactivas ? {} : { activo: true },
    orderBy: [{ orden: "asc" }, { id: "asc" }],
  });
}

export function findById(id: number) {
  return prisma.etapa.findUnique({ where: { id } });
}

// Oportunidades que están HOY en la etapa (el historial no cuenta).
export function contarOportunidades(etapaId: number) {
  return prisma.oportunidad.count({ where: { etapaId } });
}

export function contarActivasDelTipo(tipo: TipoEtapa, excluirId?: number) {
  return prisma.etapa.count({ where: { tipo, activo: true, ...(excluirId ? { id: { not: excluirId } } : {}) } });
}

export async function siguienteOrden() {
  const { _max } = await prisma.etapa.aggregate({ _max: { orden: true } });
  return (_max.orden ?? 0) + 1;
}

export function create(data: Prisma.EtapaCreateInput) {
  return prisma.etapa.create({ data });
}

export function update(id: number, data: Prisma.EtapaUpdateInput) {
  return prisma.etapa.update({ where: { id }, data });
}

export function reordenar(ids: number[]) {
  return prisma.$transaction(ids.map((id, i) => prisma.etapa.update({ where: { id }, data: { orden: i + 1 } })));
}
