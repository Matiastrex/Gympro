import { z } from "zod";
import { ApiError } from "../../utils/apiError";
import * as contactosRepo from "./contactos.repository";
import * as oportunidadesService from "../oportunidades/oportunidades.service";

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
  origen: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

export type ContactoInput = z.infer<typeof contactoSchema>;

export const bajaSchema = z.object({
  contactarNuevamente: z.boolean(),
  motivoBaja: z.string().optional(),
});

export function listar(filtro?: string) {
  return contactosRepo.findAll(filtro);
}

export async function obtener(id: number) {
  const contacto = await contactosRepo.findById(id);
  if (!contacto) throw ApiError.notFound("Contacto no encontrado");
  return contacto;
}

export function crear(data: ContactoInput) {
  return contactosRepo.create(data as any);
}

export async function actualizar(id: number, data: ContactoInput) {
  await obtener(id);
  return contactosRepo.update(id, data as any);
}

export async function darDeBaja(
  id: number,
  contactarNuevamente: boolean,
  usuarioId: number,
  motivoBaja?: string
) {
  const contacto = await obtener(id);
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
      usuarioId,
      motivoBaja,
      estadoEntidad: estado,
    });
    return obtener(id);
  }

  return contactosRepo.darDeBaja(id, estado);
}
