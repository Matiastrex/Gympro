import { z } from "zod";
import { ApiError } from "../../utils/apiError";
import { Actor } from "../../utils/permisos";
import { Paginado, paginacionSchema, paginado } from "../../utils/paginacion";
import * as notificacionesRepo from "./notificaciones.repository";
import type { NotificacionConRelaciones } from "./notificaciones.repository";

export const listadoSchema = paginacionSchema.extend({
  soloNoLeidas: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type ListadoNotificaciones = z.infer<typeof listadoSchema>;

export async function listar(
  { soloNoLeidas, page, pageSize }: ListadoNotificaciones,
  actor: Actor
): Promise<Paginado<NotificacionConRelaciones>> {
  const { items, total } = await notificacionesRepo.findPorUsuario(actor.userId, soloNoLeidas, { page, pageSize });
  return paginado(items, total, { page, pageSize });
}

export async function noLeidas(actor: Actor) {
  return { total: await notificacionesRepo.contarNoLeidas(actor.userId) };
}

export async function marcarLeida(id: number, actor: Actor) {
  const { count } = await notificacionesRepo.marcarLeida(id, actor.userId);
  if (count === 0) throw ApiError.notFound("Notificación no encontrada");
}

export async function marcarTodas(actor: Actor) {
  const { count } = await notificacionesRepo.marcarTodas(actor.userId);
  return { marcadas: count };
}
