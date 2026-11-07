import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";

export interface Rango {
  desde: Date;
  hasta: Date;
}

const ESTADOS_INSCRIPTO = ["GANADA", "BAJA"] as const; // una inscripción cancelada también se ganó

export function contarAbiertas(scope: Prisma.OportunidadWhereInput) {
  return prisma.oportunidad.aggregate({
    where: { ...scope, estado: "ABIERTA" },
    _count: { _all: true },
    _sum: { valorEstimado: true },
  });
}

export function cerradasEnRango(scope: Prisma.OportunidadWhereInput, { desde, hasta }: Rango) {
  return prisma.oportunidad.findMany({
    where: {
      ...scope,
      estado: { in: [...ESTADOS_INSCRIPTO, "PERDIDA"] },
      fechaRealCierre: { gte: desde, lte: hasta },
    },
    select: { estado: true, fechaRealCierre: true, valorEstimado: true },
  });
}

export function abiertasPorEtapa(scope: Prisma.OportunidadWhereInput) {
  return prisma.oportunidad.groupBy({
    by: ["etapaId"],
    where: { ...scope, estado: "ABIERTA" },
    _count: { _all: true },
  });
}

export function etapasAbiertas() {
  return prisma.etapa.findMany({ where: { tipo: "ABIERTA" }, orderBy: { orden: "asc" }, select: { id: true, nombre: true } });
}

export function motivosPerdida(scope: Prisma.OportunidadWhereInput, { desde, hasta }: Rango) {
  return prisma.oportunidad.groupBy({
    by: ["motivoPerdida"],
    where: { ...scope, estado: "PERDIDA", fechaRealCierre: { gte: desde, lte: hasta } },
    _count: { _all: true },
  });
}

export function actividadesPorTipo(scope: Prisma.ActividadWhereInput, { desde, hasta }: Rango) {
  return prisma.actividad.groupBy({
    by: ["tipoActividadId"],
    where: { ...scope, fecha: { gte: desde, lte: hasta } },
    _count: { _all: true },
  });
}

export function tiposActividad() {
  return prisma.tipoActividad.findMany({ select: { id: true, nombre: true } });
}

export function reaperturasPendientes() {
  return prisma.solicitudReapertura.count({ where: { estado: "PENDIENTE" } });
}
