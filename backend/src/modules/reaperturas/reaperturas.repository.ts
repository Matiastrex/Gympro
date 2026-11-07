import { EstadoSolicitud, Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import * as notificacionesRepo from "../notificaciones/notificaciones.repository";

const usuarioResumen = { select: { id: true, nombre: true, apellido: true } } as const;

export const includeSolicitud = {
  oportunidad: { select: { id: true, titulo: true, estado: true, etapa: { select: { id: true, nombre: true } } } },
  etapaDestino: { select: { id: true, nombre: true } },
  solicitante: usuarioResumen,
  resueltaPor: usuarioResumen,
} satisfies Prisma.SolicitudReaperturaInclude;

export type SolicitudConRelaciones = Prisma.SolicitudReaperturaGetPayload<{ include: typeof includeSolicitud }>;

type NotificacionNueva = Omit<Prisma.NotificacionCreateManyInput, "solicitudId">;

export function findMany(where: Prisma.SolicitudReaperturaWhereInput) {
  return prisma.solicitudReapertura.findMany({ where, include: includeSolicitud, orderBy: [{ createdAt: "desc" }] });
}

export function findById(id: number) {
  return prisma.solicitudReapertura.findUnique({ where: { id }, include: includeSolicitud });
}

export function findPendiente(oportunidadId: number) {
  return prisma.solicitudReapertura.findFirst({ where: { oportunidadId, estado: "PENDIENTE" } });
}

export function findEtapa(id: number) {
  return prisma.etapa.findUnique({ where: { id } });
}

export function findUsuario(id: number) {
  return prisma.usuario.findUnique({ where: { id }, select: usuarioResumen.select });
}

export async function findAdminsActivos() {
  const admins = await prisma.usuario.findMany({ where: { rol: "ADMINISTRADOR", activo: true }, select: { id: true } });
  return admins.map((a) => a.id);
}

// Solicitud + avisos a los administradores, todo o nada.
export function crearSolicitud(
  data: Prisma.SolicitudReaperturaUncheckedCreateInput,
  notificaciones: NotificacionNueva[]
) {
  return prisma.$transaction(async (tx) => {
    const solicitud = await tx.solicitudReapertura.create({ data, include: includeSolicitud });
    await notificacionesRepo.crearMuchas(
      tx,
      notificaciones.map((n) => ({ ...n, solicitudId: solicitud.id }))
    );
    return solicitud;
  });
}

// Pasa la solicitud de PENDIENTE a su resolución. Si otro admin ya la
// resolvió (doble click, dos pestañas), no actualiza nada y se corta acá.
async function resolver(
  tx: Prisma.TransactionClient,
  id: number,
  estado: Exclude<EstadoSolicitud, "PENDIENTE">,
  resueltaPorId: number,
  comentarioResolucion: string | null
) {
  const { count } = await tx.solicitudReapertura.updateMany({
    where: { id, estado: "PENDIENTE" },
    data: { estado, resueltaPorId, resueltaEn: new Date(), comentarioResolucion },
  });
  if (count === 0) throw ApiError.badRequest("La solicitud ya fue resuelta");
}

export interface Reapertura {
  oportunidadId: number;
  etapaAnteriorId: number;
  etapaDestinoId: number;
  empresaId: number | null;
  contactoId: number | null;
  /** Quién autoriza: queda como autor del cambio de etapa. */
  adminId: number;
  observacion: string;
  /** Presente si la reapertura resuelve una solicitud (no cuando el admin reabre directo). */
  solicitud?: { id: number; aviso: NotificacionNueva };
}

// Reabre una oportunidad perdida en una sola transacción: la oportunidad
// vuelve a ABIERTA, su contacto/empresa a POTENCIAL con esta oportunidad
// como la abierta, y queda la fila del historial (además de la solicitud y su aviso).
export function reabrir(r: Reapertura) {
  return prisma.$transaction(async (tx) => {
    if (r.solicitud) await resolver(tx, r.solicitud.id, "APROBADA", r.adminId, null);

    const oportunidad = await tx.oportunidad.update({
      where: { id: r.oportunidadId },
      data: { etapaId: r.etapaDestinoId, estado: "ABIERTA", fechaRealCierre: null, motivoPerdida: null },
    });

    if (r.empresaId != null) {
      await tx.empresa.update({
        where: { id: r.empresaId },
        data: { estado: "POTENCIAL", oportunidadAbiertaId: r.oportunidadId },
      });
      // Igual que al crear: los empleados del convenio siguen el estado de la empresa.
      await tx.contacto.updateMany({ where: { empresaId: r.empresaId }, data: { estado: "POTENCIAL" } });
    }
    if (r.contactoId != null) {
      await tx.contacto.update({
        where: { id: r.contactoId },
        data: { estado: "POTENCIAL", oportunidadAbiertaId: r.oportunidadId },
      });
    }

    await tx.historialEtapa.create({
      data: {
        oportunidadId: r.oportunidadId,
        etapaAnteriorId: r.etapaAnteriorId,
        etapaNuevaId: r.etapaDestinoId,
        usuarioId: r.adminId,
        observacion: r.observacion,
      },
    });

    if (r.solicitud) {
      await notificacionesRepo.crearMuchas(tx, [{ ...r.solicitud.aviso, solicitudId: r.solicitud.id }]);
    }
    return oportunidad;
  });
}

export function rechazar(id: number, adminId: number, comentario: string, aviso: NotificacionNueva) {
  return prisma.$transaction(async (tx) => {
    await resolver(tx, id, "RECHAZADA", adminId, comentario);
    await notificacionesRepo.crearMuchas(tx, [{ ...aviso, solicitudId: id }]);
    return tx.solicitudReapertura.findUniqueOrThrow({ where: { id }, include: includeSolicitud });
  });
}
