import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";

const includeCompleto = {
  empresa: { select: { id: true, razonSocial: true } },
  contacto: { select: { id: true, nombre: true, apellido: true } },
  responsable: { select: { id: true, nombre: true, apellido: true } },
  producto: { select: { id: true, nombre: true } },
  etapa: true,
} satisfies Prisma.OportunidadInclude;

export function findAll(filtros: { etapaId?: number; responsableId?: number }) {
  return prisma.oportunidad.findMany({
    where: {
      etapaId: filtros.etapaId,
      responsableId: filtros.responsableId,
    },
    include: includeCompleto,
    orderBy: { updatedAt: "desc" },
  });
}

export function findById(id: number) {
  return prisma.oportunidad.findUnique({
    where: { id },
    include: {
      ...includeCompleto,
      historialEtapas: {
        include: { etapaNueva: true, usuario: { select: { nombre: true, apellido: true } } },
        orderBy: { fecha: "desc" },
      },
      actividades: { orderBy: { fecha: "desc" } },
    },
  });
}

export function create(data: Prisma.OportunidadCreateInput) {
  return prisma.$transaction(async (tx) => {
    const oportunidad = await tx.oportunidad.create({ data, include: includeCompleto });
    const empresaId = (data as unknown as Prisma.OportunidadUncheckedCreateInput).empresaId;
    const contactoId = (data as unknown as Prisma.OportunidadUncheckedCreateInput).contactoId;

    if (empresaId != null) {
      await tx.empresa.update({
        where: { id: empresaId },
        data: { oportunidadAbiertaId: oportunidad.id },
      });
    }

    if (contactoId != null) {
      await tx.contacto.update({
        where: { id: contactoId },
        data: { oportunidadAbiertaId: oportunidad.id },
      });
    }

    return oportunidad;
  });
}

export function findEtapaTipo(id: number) {
  return prisma.etapa.findUnique({ where: { id }, select: { tipo: true } });
}

export function update(id: number, data: Prisma.OportunidadUpdateInput) {
  return prisma.oportunidad.update({ where: { id }, data, include: includeCompleto });
}

// Agrupa las oportunidades por etapa para el tablero del embudo comercial.
// Ojo: se agrupan TODAS las oportunidades (no solo las ABIERTA), porque el
// propio etapaId ya indica en qué columna va. Si acá filtráramos por estado
// ABIERTA, las oportunidades recién cerradas (Inscripto/Perdida) desaparecerían
// del tablero entero en vez de mostrarse en su columna de cierre.
export async function findAgrupadasPorEtapa() {
  const etapas = await prisma.etapa.findMany({ orderBy: { orden: "asc" } });
  const oportunidades = await prisma.oportunidad.findMany({
    include: includeCompleto,
  });

  return etapas.map((etapa) => ({
    etapa,
    oportunidades: oportunidades.filter((o) => o.etapaId === etapa.id),
  }));
}

// Cambiar de etapa + registrar el historial se hace en una sola transacción
// para que nunca quede una oportunidad "movida" sin su registro de auditoría.
export function cambiarEtapa(params: {
  oportunidadId: number;
  etapaAnteriorId: number;
  etapaNuevaId: number;
  usuarioId: number;
  observacion?: string;
  camposDerivados?: Prisma.OportunidadUncheckedUpdateInput;
  camposActualizacion?: Prisma.OportunidadUncheckedUpdateInput;
  empresaIdToClear?: number | null;
  contactoIdToClear?: number | null;
}) {
  const {
    oportunidadId,
    etapaAnteriorId,
    etapaNuevaId,
    usuarioId,
    observacion,
    camposDerivados,
    camposActualizacion,
    empresaIdToClear,
    contactoIdToClear,
  } = params;

  return prisma.$transaction(async (tx) => {
    const oportunidad = await tx.oportunidad.update({
      where: { id: oportunidadId },
      data: { etapaId: etapaNuevaId, ...camposActualizacion, ...camposDerivados },
      include: includeCompleto,
    });

    if (empresaIdToClear != null) {
      await tx.empresa.update({
        where: { id: empresaIdToClear },
        data: { oportunidadAbiertaId: null },
      });
    }

    if (contactoIdToClear != null) {
      await tx.contacto.update({
        where: { id: contactoIdToClear },
        data: { oportunidadAbiertaId: null },
      });
    }

    await tx.historialEtapa.create({
      data: {
        oportunidadId,
        etapaAnteriorId,
        etapaNuevaId,
        usuarioId,
        observacion,
      },
    });

    return oportunidad;
  });
}
