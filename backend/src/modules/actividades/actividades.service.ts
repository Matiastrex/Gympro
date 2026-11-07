import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/apiError";
import { Actor, alcanceActividades, verificarAccesoRelacion } from "../../utils/permisos";
import { Paginado, paginacionSchema, paginado } from "../../utils/paginacion";
import { ExactlyOne } from "../../utils/tipos";
import * as actividadesRepo from "./actividades.repository";
import type { ActividadConRelaciones, HistorialEtapaConRelaciones } from "./actividades.repository";
import * as contactosService from "../contactos/contactos.service";
import * as empresasService from "../empresas/empresas.service";
import * as oportunidadesService from "../oportunidades/oportunidades.service";

const idOpcional = z.number().int().positive().optional().nullable();

export const actividadSchema = z.object({
  tipoActividadId: z.number().int().positive({ message: "Elegí el tipo de actividad" }),
  // Cuándo ocurrió. Si no viene, se toma el momento de la carga.
  fecha: z.string().datetime({ offset: true }).optional(),
  descripcion: z.string().trim().min(1, "Contá qué pasó en la actividad"),
  resultado: z.string().trim().optional().nullable(),
  contactoId: idOpcional,
  empresaId: idOpcional,
  oportunidadId: idOpcional,
});

export type ActividadInput = z.infer<typeof actividadSchema>;

const idQuery = z.coerce.number().int().positive().optional();

export const filtrosSchema = paginacionSchema.extend({
  tipoActividadId: idQuery,
  usuarioId: idQuery,
  contactoId: idQuery,
  empresaId: idQuery,
  oportunidadId: idQuery,
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  q: z.string().trim().optional(),
});

export type FiltrosActividades = z.infer<typeof filtrosSchema>;

// ---------- Historial comercial ----------

type IdsEntidad = { contactoId: number; empresaId: number; oportunidadId: number };

// Un historial es siempre de UNA entidad: contacto, empresa u oportunidad.
export type RefEntidad = ExactlyOne<IdsEntidad>;

export const refEntidadSchema = z
  .object({ contactoId: idQuery, empresaId: idQuery, oportunidadId: idQuery })
  .refine((ref) => [ref.contactoId, ref.empresaId, ref.oportunidadId].filter((id) => id != null).length === 1, {
    message: "Indicá exactamente uno de contactoId, empresaId u oportunidadId",
    path: ["entidad"],
  })
  .transform((ref) => ref as RefEntidad);

/** Un ítem de la línea de tiempo: una actividad registrada o un cambio de etapa. */
export type HistorialItem =
  | { kind: "actividad"; fecha: Date; actividad: ActividadConRelaciones }
  | { kind: "etapa"; fecha: Date; cambio: HistorialEtapaConRelaciones };

type FiltrosHistorial = { actividades: Prisma.ActividadWhereInput; etapas: Prisma.HistorialEtapaWhereInput };

// Verifica que el actor pueda VER la entidad y arma los filtros de su historial.
async function filtrosHistorial(ref: RefEntidad, actor: Actor): Promise<FiltrosHistorial> {
  if (ref.contactoId != null) {
    const id = ref.contactoId;
    await contactosService.obtener(id, actor, "ver");
    return {
      actividades: { OR: [{ contactoId: id }, { oportunidad: { contactoId: id } }] },
      etapas: { oportunidad: { contactoId: id } },
    };
  }
  if (ref.empresaId != null) {
    const id = ref.empresaId;
    await empresasService.obtener(id, actor, "ver");
    // Incluye lo registrado sobre sus empleados (contactos del convenio).
    return {
      actividades: { OR: [{ empresaId: id }, { contacto: { empresaId: id } }, { oportunidad: { empresaId: id } }] },
      etapas: { oportunidad: { OR: [{ empresaId: id }, { contacto: { empresaId: id } }] } },
    };
  }
  const id = ref.oportunidadId;
  await oportunidadesService.obtener(id, actor);
  return { actividades: { oportunidadId: id }, etapas: { oportunidadId: id } };
}

export async function historial(ref: RefEntidad, actor: Actor): Promise<HistorialItem[]> {
  const filtros = await filtrosHistorial(ref, actor);
  const [actividades, cambios] = await Promise.all([
    actividadesRepo.findMany(filtros.actividades),
    actividadesRepo.findHistorialEtapas(filtros.etapas),
  ]);
  const items: HistorialItem[] = [
    ...actividades.map((actividad) => ({ kind: "actividad" as const, fecha: actividad.fecha, actividad })),
    ...cambios.map((cambio) => ({ kind: "etapa" as const, fecha: cambio.fecha, cambio })),
  ];
  return items.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}

// ---------- Listado ----------

export async function listar(filtros: FiltrosActividades, actor: Actor): Promise<Paginado<ActividadConRelaciones>> {
  const { page, pageSize, desde, hasta, q, ...ids } = filtros;
  const where: Prisma.ActividadWhereInput = {
    AND: [
      alcanceActividades(actor),
      ids,
      desde || hasta ? { fecha: { gte: desde, lte: hasta } } : {},
      q ? { OR: [{ descripcion: { contains: q } }, { resultado: { contains: q } }] } : {},
    ],
  };
  const { items, total } = await actividadesRepo.findPaginado(where, { page, pageSize });
  return paginado(items, total, { page, pageSize });
}

// ---------- Alta ----------

// Margen para diferencias de reloj entre el navegador y el servidor.
const TOLERANCIA_FUTURO_MS = 60_000;

type Relaciones = Pick<ActividadInput, "contactoId" | "empresaId" | "oportunidadId">;

/**
 * Valida permisos sobre lo relacionado y completa los vínculos implícitos:
 * - desde una oportunidad se heredan su contacto y su empresa;
 * - un contacto con convenio arrastra su empresa.
 * Así la actividad aparece en el historial de todos ellos.
 */
async function resolverRelaciones(data: Relaciones, actor: Actor) {
  let contactoId = data.contactoId ?? null;
  let empresaId = data.empresaId ?? null;
  const oportunidadId = data.oportunidadId ?? null;

  if (oportunidadId == null && contactoId == null && empresaId == null) {
    throw ApiError.badRequest("La actividad debe relacionarse con un contacto, una empresa o una oportunidad");
  }

  if (oportunidadId != null) {
    const oportunidad = await oportunidadesService.obtener(oportunidadId, actor);
    if ((contactoId != null && contactoId !== oportunidad.contactoId) || (empresaId != null && empresaId !== oportunidad.empresaId)) {
      throw ApiError.badRequest("El contacto o la empresa no corresponden a la oportunidad elegida");
    }
    contactoId = oportunidad.contactoId;
    empresaId = oportunidad.empresaId;
  } else {
    await verificarAccesoRelacion(actor, "contacto", contactoId);
    await verificarAccesoRelacion(actor, "empresa", empresaId);
  }

  if (contactoId != null) {
    const contacto = await actividadesRepo.findContactoEmpresa(contactoId);
    if (!contacto) throw ApiError.notFound("Contacto no encontrado");
    if (empresaId != null && contacto.empresaId != null && contacto.empresaId !== empresaId) {
      throw ApiError.badRequest("El contacto no pertenece a esa empresa");
    }
    empresaId ??= contacto.empresaId;
  }
  if (empresaId != null && !(await actividadesRepo.existeEmpresa(empresaId))) {
    throw ApiError.notFound("Empresa no encontrada");
  }

  return { contactoId, empresaId, oportunidadId };
}

export async function registrar(input: ActividadInput, actor: Actor) {
  const tipo = await actividadesRepo.findTipo(input.tipoActividadId);
  if (!tipo?.activo) throw ApiError.badRequest("El tipo de actividad no existe o está desactivado");

  const fecha = input.fecha ? new Date(input.fecha) : new Date();
  if (fecha.getTime() > Date.now() + TOLERANCIA_FUTURO_MS) {
    // Una actividad es un hecho que ya ocurrió; agenda y tareas están fuera de alcance.
    throw ApiError.badRequest("La fecha no puede ser futura: solo se registran actividades que ya ocurrieron");
  }

  const relaciones = await resolverRelaciones(input, actor);

  return actividadesRepo.create({
    tipoActividadId: tipo.id,
    fecha,
    descripcion: input.descripcion,
    resultado: input.resultado || null,
    usuarioId: actor.userId,
    ...relaciones,
  });
}
