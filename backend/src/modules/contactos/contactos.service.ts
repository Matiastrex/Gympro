import { z } from "zod";
import { Prisma } from "@prisma/client";
import { idQuery, paginacionOpcionalSchema, paginado } from "../../utils/paginacion";
import { ApiError } from "../../utils/apiError";
import * as contactosRepo from "./contactos.repository";
import * as oportunidadesService from "../oportunidades/oportunidades.service";
import * as catalogosService from "../catalogos/catalogos.service";
import { Actor, Modo, alcanceConCreador, resolverResponsable, verificarAcceso, verificarAccesoRelacion } from "../../utils/permisos";

export const contactoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellido: z.string().min(1, "El apellido es obligatorio"),
  documento: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  telefono: z.string().optional().nullable(),
  empresaId: z.number().int().optional().nullable(),
  responsableId: z.number().int().optional().nullable(),
  estado: z.enum(["POTENCIAL", "CLIENTE", "INACTIVO", "NO_CONTACTAR"]).optional(),
  origenId: z.number().int().positive().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

export type ContactoInput = z.infer<typeof contactoSchema>;

export const bajaSchema = z.object({
  contactarNuevamente: z.boolean(),
  motivoBaja: z.string().optional(),
});

export const listadoSchema = paginacionOpcionalSchema.extend({
  q: z.string().trim().optional(),
  estado: z.enum(["POTENCIAL", "CLIENTE", "INACTIVO", "NO_CONTACTAR"]).optional(),
  responsableId: idQuery,
  origenId: idQuery,
  empresaId: idQuery,
});

export type FiltrosContactos = z.infer<typeof listadoSchema>;

// La visibilidad del rol va en su propio AND: un filtro no puede ampliarla.
export async function listar(filtros: FiltrosContactos, actor: Actor) {
  const { page, pageSize, q, estado, responsableId, origenId, empresaId } = filtros;
  const where: Prisma.ContactoWhereInput = {
    AND: [
      alcanceConCreador(actor),
      { estado, responsableId, origenId, empresaId },
      q
        ? {
            OR: [
              { nombre: { contains: q } },
              { apellido: { contains: q } },
              { email: { contains: q } },
              { documento: { contains: q } },
            ],
          }
        : {},
    ],
  };
  if (!page) return contactosRepo.findAll(where);
  const { items, total } = await contactosRepo.findPaginado(where, { page, pageSize });
  return paginado(items, total, { page, pageSize });
}

export async function obtener(id: number, actor: Actor, modo: Modo = "editar") {
  const contacto = await contactosRepo.findById(id);
  if (!contacto) throw ApiError.notFound("Contacto no encontrado");
  verificarAcceso(actor, contacto, "contacto", modo);
  return contacto;
}

export async function crear(data: ContactoInput, actor: Actor) {
  await verificarAccesoRelacion(actor, "empresa", data.empresaId);
  await catalogosService.validarSeleccion("origenes", data.origenId);
  const responsableId = await resolverResponsable(actor, data.responsableId);
  return contactosRepo.create({ ...data, responsableId, creadoPorId: actor.userId } as any);
}

export async function actualizar(id: number, data: ContactoInput, actor: Actor) {
  const contacto = await obtener(id, actor);
  await catalogosService.validarSeleccion("origenes", data.origenId, contacto.origenId);
  if (data.empresaId !== contacto.empresaId) {
    await verificarAccesoRelacion(actor, "empresa", data.empresaId);
  }
  const responsableId = await resolverResponsable(actor, data.responsableId, contacto.responsableId);
  return contactosRepo.update(id, { ...data, responsableId } as any);
}

export async function darDeBaja(
  id: number,
  contactarNuevamente: boolean,
  actor: Actor,
  motivoBaja?: string
) {
  const contacto = await obtener(id, actor);
  // Mismas restricciones que el formulario de edición: con una oportunidad
  // abierta o con convenio corporativo, el estado del contacto no se toca a mano.
  if (contacto.oportunidadAbiertaId != null) {
    throw ApiError.badRequest("No se puede dar de baja un contacto con una oportunidad abierta");
  }
  if (contacto.empresaId != null) {
    throw ApiError.badRequest("El estado del contacto depende de su empresa; dá de baja la empresa");
  }
  const estado = contactarNuevamente ? "INACTIVO" : "NO_CONTACTAR";

  // Si es socio inscripto, darlo de baja es cancelar su inscripción.
  const inscripcion = contacto.estado === "CLIENTE"
    ? contacto.oportunidades.find((o) => o.estado === "GANADA")
    : undefined;
  if (inscripcion) {
    await oportunidadesService.cancelarInscripcion({
      oportunidadId: inscripcion.id,
      usuarioId: actor.userId,
      motivoBaja,
      estadoEntidad: estado,
    });
    return obtener(id, actor);
  }

  return contactosRepo.darDeBaja(id, estado);
}
