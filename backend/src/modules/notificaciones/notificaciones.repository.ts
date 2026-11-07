import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { Paginacion, skipTake } from "../../utils/paginacion";

const usuarioResumen = { select: { id: true, nombre: true, apellido: true } } as const;

export const includeNotificacion = {
  oportunidad: { select: { id: true, titulo: true, estado: true } },
  solicitud: {
    include: {
      etapaDestino: { select: { id: true, nombre: true } },
      solicitante: usuarioResumen,
      resueltaPor: usuarioResumen,
    },
  },
} satisfies Prisma.NotificacionInclude;

export type NotificacionConRelaciones = Prisma.NotificacionGetPayload<{ include: typeof includeNotificacion }>;

// Recibe el cliente de la transacción: una notificación se crea siempre junto
// con el hecho que la origina (solicitud, aprobación o rechazo), nunca suelta.
export function crearMuchas(tx: Prisma.TransactionClient, data: Prisma.NotificacionCreateManyInput[]) {
  return tx.notificacion.createMany({ data });
}

export async function findPorUsuario(usuarioId: number, soloNoLeidas: boolean, paginacion: Paginacion) {
  const where: Prisma.NotificacionWhereInput = { usuarioId, ...(soloNoLeidas ? { leida: false } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.notificacion.findMany({
      where,
      include: includeNotificacion,
      orderBy: [{ leida: "asc" }, { createdAt: "desc" }, { id: "desc" }],
      ...skipTake(paginacion),
    }),
    prisma.notificacion.count({ where }),
  ]);
  return { items, total };
}

export function contarNoLeidas(usuarioId: number) {
  return prisma.notificacion.count({ where: { usuarioId, leida: false } });
}

// `usuarioId` en el where: nadie puede marcar como leída la notificación de otro.
export function marcarLeida(id: number, usuarioId: number) {
  return prisma.notificacion.updateMany({ where: { id, usuarioId }, data: { leida: true } });
}

export function marcarTodas(usuarioId: number) {
  return prisma.notificacion.updateMany({ where: { usuarioId, leida: false }, data: { leida: true } });
}
