import { Prisma, Rol } from "@prisma/client";
import { prisma } from "../config/db";
import { ApiError } from "./apiError";
import { JwtPayload } from "./jwt";

// Quién está haciendo la operación: lo que requireAuth deja en req.user.
export type Actor = JwtPayload;

// Administrador y responsable comercial ven la cartera de todo el equipo y
// pueden asignar/reasignar responsables. El vendedor solo trabaja sobre lo
// que tiene asignado.
const ROLES_CON_VISION_TOTAL = ["ADMINISTRADOR", "RESPONSABLE_COMERCIAL"] as const satisfies readonly Rol[];

type RolConVisionTotal = (typeof ROLES_CON_VISION_TOTAL)[number];

export function veTodo(actor: Actor): actor is Actor & { rol: RolConVisionTotal } {
  return (ROLES_CON_VISION_TOTAL as readonly Rol[]).includes(actor.rol);
}

// Filtro `where` para listados: vacío si ve todo, su cartera si es vendedor.
export function alcance(actor: Actor): { responsableId?: number } {
  return veTodo(actor) ? {} : { responsableId: actor.userId };
}

// Listados de contactos y empresas: el vendedor ve lo que tiene asignado y
// también lo que cargó él, aunque después se lo hayan reasignado a otro.
export function alcanceConCreador(actor: Actor): { OR?: [{ responsableId: number }, { creadoPorId: number }] } {
  return veTodo(actor) ? {} : { OR: [{ responsableId: actor.userId }, { creadoPorId: actor.userId }] };
}

// Listado de actividades: el vendedor ve las que registró y las de los
// registros que tiene asignados (aunque las haya cargado otro).
export function alcanceActividades(actor: Actor): Prisma.ActividadWhereInput {
  if (veTodo(actor)) return {};
  const propio = { responsableId: actor.userId };
  return {
    OR: [
      { usuarioId: actor.userId },
      { contacto: propio },
      { empresa: propio },
      { oportunidad: propio },
    ],
  };
}

type Asignable ={ responsableId: number | null; creadoPorId?: number | null };

// "ver" incluye a quien creó el registro (solo lectura); "editar" exige ser
// el responsable actual.
export type Modo = "ver" | "editar";

type Entidad = "empresa" | "contacto" | "oportunidad";

const MENSAJE_AJENO = {
  empresa: "La empresa está asignada a otro vendedor",
  contacto: "El contacto está asignado a otro vendedor",
  oportunidad: "La oportunidad está asignada a otro vendedor",
} as const satisfies Record<Entidad, string>;

export function verificarAcceso(actor: Actor, registro: Asignable, entidad: Entidad, modo: Modo = "editar") {
  if (veTodo(actor) || registro.responsableId === actor.userId) return;
  if (modo === "ver" && registro.creadoPorId != null && registro.creadoPorId === actor.userId) return;
  throw ApiError.forbidden(MENSAJE_AJENO[entidad]);
}

// Para relaciones que llegan por id desde un formulario (la empresa de un
// contacto, el contacto/empresa de una oportunidad).
export async function verificarAccesoRelacion(
  actor: Actor,
  tipo: "empresa" | "contacto",
  id: number | null | undefined
) {
  if (id == null || veTodo(actor)) return;
  const registro =
    tipo === "empresa"
      ? await prisma.empresa.findUnique({ where: { id }, select: { responsableId: true } })
      : await prisma.contacto.findUnique({ where: { id }, select: { responsableId: true } });
  if (!registro) throw ApiError.notFound(tipo === "empresa" ? "Empresa no encontrada" : "Contacto no encontrado");
  verificarAcceso(actor, registro, tipo);
}

/**
 * Decide el responsable que se guarda al crear (`actual` ausente) o editar.
 * - Vendedor: siempre él mismo; intentar asignar a otro es un 403.
 * - Admin / responsable comercial: el que pidan (o el actual si no mandan
 *   el campo), validando que sea un usuario activo cuando cambia.
 */
export async function resolverResponsable(
  actor: Actor,
  solicitado: number | null | undefined,
  actual?: number | null
): Promise<number | null> {
  if (!veTodo(actor)) {
    const propio = actor.userId;
    if (solicitado !== undefined && solicitado !== propio && solicitado !== actual) {
      throw ApiError.forbidden("Solo el administrador o el responsable comercial pueden asignar a otro responsable");
    }
    return propio;
  }

  const responsableId = solicitado === undefined ? actual ?? null : solicitado;
  if (responsableId != null && responsableId !== actual) {
    const usuario = await prisma.usuario.findUnique({ where: { id: responsableId }, select: { activo: true } });
    if (!usuario?.activo) throw ApiError.badRequest("El responsable elegido no existe o está desactivado");
  }
  return responsableId;
}
