import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { Paginacion, skipTake } from "../../utils/paginacion";

const usuarioResumen = { select: { id: true, nombre: true, apellido: true } } as const;

// Forma única de una actividad en cualquier respuesta (listado, alta, historial).
export const includeActividad = {
  tipoActividad: { select: { id: true, nombre: true } },
  usuario: usuarioResumen,
  contacto: { select: { id: true, nombre: true, apellido: true } },
  empresa: { select: { id: true, razonSocial: true } },
  oportunidad: { select: { id: true, titulo: true } },
} satisfies Prisma.ActividadInclude;

export type ActividadConRelaciones = Prisma.ActividadGetPayload<{ include: typeof includeActividad }>;

const includeHistorialEtapa = {
  etapaAnterior: { select: { id: true, nombre: true, tipo: true } },
  etapaNueva: { select: { id: true, nombre: true, tipo: true } },
  usuario: usuarioResumen,
  oportunidad: { select: { id: true, titulo: true } },
} satisfies Prisma.HistorialEtapaInclude;

export type HistorialEtapaConRelaciones = Prisma.HistorialEtapaGetPayload<{ include: typeof includeHistorialEtapa }>;

const includeEdicion = {
  usuario: usuarioResumen,
  oportunidad: { select: { id: true, titulo: true } },
} satisfies Prisma.EdicionOportunidadInclude;

export type EdicionConRelaciones = Prisma.EdicionOportunidadGetPayload<{ include: typeof includeEdicion }>;

const ordenCronologico = [{ fecha: "desc" }, { id: "desc" }] satisfies Prisma.ActividadOrderByWithRelationInput[];

export async function findPaginado(where: Prisma.ActividadWhereInput, paginacion: Paginacion) {
  const [items, total] = await prisma.$transaction([
    prisma.actividad.findMany({ where, include: includeActividad, orderBy: ordenCronologico, ...skipTake(paginacion) }),
    prisma.actividad.count({ where }),
  ]);
  return { items, total };
}

export function findMany(where: Prisma.ActividadWhereInput) {
  return prisma.actividad.findMany({ where, include: includeActividad, orderBy: ordenCronologico });
}

export function findHistorialEtapas(where: Prisma.HistorialEtapaWhereInput) {
  return prisma.historialEtapa.findMany({ where, include: includeHistorialEtapa, orderBy: ordenCronologico });
}

// Correcciones de oportunidades cerradas (ver oportunidadesService.actualizarCerrada).
export function findEdiciones(where: Prisma.EdicionOportunidadWhereInput) {
  return prisma.edicionOportunidad.findMany({ where, include: includeEdicion, orderBy: ordenCronologico });
}

export function create(data: Prisma.ActividadUncheckedCreateInput) {
  return prisma.actividad.create({ data, include: includeActividad });
}

export function findTipo(id: number) {
  return prisma.tipoActividad.findUnique({ where: { id } });
}

export function findContactoEmpresa(contactoId: number) {
  return prisma.contacto.findUnique({ where: { id: contactoId }, select: { empresaId: true } });
}

export async function existeEmpresa(id: number) {
  return (await prisma.empresa.count({ where: { id } })) > 0;
}
