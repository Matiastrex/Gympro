import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";

const includeCompleto = {
  empresa: { select: { id: true, razonSocial: true, bajaDefinitiva: true } },
  contacto: { select: { id: true, nombre: true, apellido: true, bajaDefinitiva: true } },
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
        include: {
          etapaAnterior: true,
          etapaNueva: true,
          usuario: { select: { nombre: true, apellido: true } },
        },
        orderBy: { fecha: "desc" },
      },
      // Para que el detalle muestre "reapertura pendiente" y no deje pedir otra.
      solicitudesReapertura: {
        where: { estado: "PENDIENTE" },
        select: { id: true, createdAt: true, etapaDestino: { select: { nombre: true } }, solicitante: { select: { nombre: true, apellido: true } } },
        take: 1,
      },
    },
  });
}

export function create(
  data: Prisma.OportunidadCreateInput,
  estadoEntidad: "CLIENTE" | "INACTIVO" | "POTENCIAL",
  usuarioId: number
) {
  return prisma.$transaction(async (tx) => {
    const oportunidad = await tx.oportunidad.create({ data, include: includeCompleto });
    const empresaId = (data as unknown as Prisma.OportunidadUncheckedCreateInput).empresaId;
    const contactoId = (data as unknown as Prisma.OportunidadUncheckedCreateInput).contactoId;

    if (empresaId != null) {
      await tx.empresa.update({
        where: { id: empresaId },
        data: { oportunidadAbiertaId: oportunidad.id, estado: estadoEntidad },
      });

      await tx.contacto.updateMany({
        where: { empresaId },
        data: { estado: estadoEntidad },
      });
    }

    if (contactoId != null) {
      await tx.contacto.update({
        where: { id: contactoId },
        data: { oportunidadAbiertaId: oportunidad.id, estado: estadoEntidad },
      });
    }

    await tx.historialEtapa.create({
      data: {
        oportunidadId: oportunidad.id,
        etapaAnteriorId: null,
        etapaNuevaId: oportunidad.etapaId,
        usuarioId,
        observacion: "Oportunidad creada",
      },
    });

    return oportunidad;
  });
}

export function findHistorial(oportunidadId: number) {
  return prisma.historialEtapa.findMany({
    where: { oportunidadId },
    include: {
      etapaAnterior: true,
      etapaNueva: true,
      usuario: { select: { id: true, nombre: true, apellido: true } },
    },
    orderBy: [{ fecha: "desc" }, { id: "desc" }],
  });
}

export function findEtapaPorTipo(tipo: "BAJA") {
  return prisma.etapa.findFirst({ where: { tipo }, orderBy: { orden: "asc" } });
}

export function findEtapaTipo(id: number) {
  return prisma.etapa.findUnique({ where: { id }, select: { tipo: true, esClasePrueba: true } });
}

export function findContactoParaCrear(id: number) {
  return prisma.contacto.findUnique({
    where: { id },
    select: { estado: true, oportunidadAbiertaId: true, empresaId: true, bajaDefinitiva: true },
  });
}

export function findEmpresaParaCrear(id: number) {
  return prisma.empresa.findUnique({
    where: { id },
    select: { estado: true, oportunidadAbiertaId: true, bajaDefinitiva: true },
  });
}

type Reasignacion = { responsableId: number | null; empresaId: number | null; contactoId: number | null };

// Al reasignar una oportunidad, su contacto/empresa pasan al mismo responsable:
// quien atiende la consulta es quien atiende al socio. Quien los creó los
// sigue viendo en modo lectura (ver creadoPorId).
async function reasignarEntidades(tx: Prisma.TransactionClient, { responsableId, empresaId, contactoId }: Reasignacion) {
  if (empresaId != null) await tx.empresa.update({ where: { id: empresaId }, data: { responsableId } });
  if (contactoId != null) await tx.contacto.update({ where: { id: contactoId }, data: { responsableId } });
}

export function update(id: number, data: Prisma.OportunidadUpdateInput, reasignarEntidadesA?: number | null) {
  return prisma.$transaction(async (tx) => {
    const oportunidad = await tx.oportunidad.update({ where: { id }, data, include: includeCompleto });
    if (reasignarEntidadesA !== undefined) {
      await reasignarEntidades(tx, { ...oportunidad, responsableId: reasignarEntidadesA });
    }
    return oportunidad;
  });
}

// Agrupa las oportunidades por etapa para el tablero del embudo comercial.
// Ojo: se agrupan TODAS las oportunidades (no solo las ABIERTA), porque el
// propio etapaId ya indica en qué columna va. Si acá filtráramos por estado
// ABIERTA, las oportunidades recién cerradas (Inscripto/Perdida) desaparecerían
// del tablero entero en vez de mostrarse en su columna de cierre.
export async function findAgrupadasPorEtapa(filtros: { responsableId?: number }) {
  const etapas = await prisma.etapa.findMany({ orderBy: { orden: "asc" } });
  const oportunidades = await prisma.oportunidad.findMany({
    where: { responsableId: filtros.responsableId },
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
  empresaIdToUpdate?: number | null;
  contactoIdToUpdate?: number | null;
  estadoEntidad?: "CLIENTE" | "INACTIVO" | "POTENCIAL" | "NO_CONTACTAR";
  marcarBajaDefinitiva?: boolean;
  // Presente si en la misma edición también se cambió el responsable.
  reasignarEntidadesA?: number | null;
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
    empresaIdToUpdate,
    contactoIdToUpdate,
    estadoEntidad,
    marcarBajaDefinitiva,
    reasignarEntidadesA,
  } = params;

  return prisma.$transaction(async (tx) => {
    const oportunidad = await tx.oportunidad.update({
      where: { id: oportunidadId },
      data: { etapaId: etapaNuevaId, ...camposActualizacion, ...camposDerivados },
      include: includeCompleto,
    });

    if (empresaIdToUpdate != null) {
      await tx.empresa.update({
        where: { id: empresaIdToUpdate },
        data: {
          estado: estadoEntidad,
          ...(empresaIdToClear != null ? { oportunidadAbiertaId: null } : {}),
          ...(marcarBajaDefinitiva ? { bajaDefinitiva: true } : {}),
        },
      });

      // Si la empresa (convenio corporativo) se da de baja, todos sus
      // contactos quedan dados de baja también, no solo la empresa.
      // NO_CONTACTAR es una decisión sobre el convenio, no sobre cada empleado
      // (misma regla que empresas.repository update()).
      await tx.contacto.updateMany({
        where: { empresaId: empresaIdToUpdate },
        data: {
          estado: estadoEntidad === "NO_CONTACTAR" ? "INACTIVO" : estadoEntidad,
          ...(marcarBajaDefinitiva ? { bajaDefinitiva: true } : {}),
        },
      });
    }

    if (contactoIdToUpdate != null) {
      await tx.contacto.update({
        where: { id: contactoIdToUpdate },
        data: {
          estado: estadoEntidad,
          ...(contactoIdToClear != null ? { oportunidadAbiertaId: null } : {}),
          ...(marcarBajaDefinitiva ? { bajaDefinitiva: true } : {}),
        },
      });
    }

    if (reasignarEntidadesA !== undefined) {
      await reasignarEntidades(tx, { ...oportunidad, responsableId: reasignarEntidadesA });
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
