import { z } from "zod";
import { ApiError } from "../../utils/apiError";
import * as empresasRepo from "./empresas.repository";
import * as oportunidadesService from "../oportunidades/oportunidades.service";
import { Actor, Modo, alcanceConCreador, resolverResponsable, verificarAcceso } from "../../utils/permisos";

export const empresaSchema = z.object({
  razonSocial: z.string().min(1, "La razón social es obligatoria"),
  cuit: z.string().optional().nullable(),
  industria: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  sitioWeb: z.string().optional().nullable(),
  estado: z.enum(["POTENCIAL", "CLIENTE", "INACTIVO", "NO_CONTACTAR"]).optional(),
  origen: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  responsableId: z.number().int().optional().nullable(),
});

export type EmpresaInput = z.infer<typeof empresaSchema>;

export const bajaSchema = z.object({
  contactarNuevamente: z.boolean(),
  motivoBaja: z.string().optional(),
});

export function listar(actor: Actor, filtro?: string) {
  return empresasRepo.findAll({ filtro, visibilidad: alcanceConCreador(actor) });
}

export async function obtener(id: number, actor: Actor, modo: Modo = "editar") {
  const empresa = await empresasRepo.findById(id);
  if (!empresa) throw ApiError.notFound("Empresa no encontrada");
  verificarAcceso(actor, empresa, "empresa", modo);
  return empresa;
}

export async function crear(data: EmpresaInput, actor: Actor) {
  const responsableId = await resolverResponsable(actor, data.responsableId);
  return empresasRepo.create({ ...data, responsableId, creadoPorId: actor.userId } as any);
}

export async function actualizar(id: number, data: EmpresaInput, actor: Actor) {
  const empresa = await obtener(id, actor);
  const responsableId = await resolverResponsable(actor, data.responsableId, empresa.responsableId);
  return empresasRepo.update(id, { ...data, responsableId } as any);
}

export async function darDeBaja(
  id: number,
  contactarNuevamente: boolean,
  actor: Actor,
  motivoBaja?: string
) {
  const empresa = await obtener(id, actor);
  if (empresa.oportunidadAbiertaId != null) {
    throw ApiError.badRequest("No se puede dar de baja una empresa con una oportunidad abierta");
  }
  const estado = contactarNuevamente ? "INACTIVO" : "NO_CONTACTAR";

  // Si el convenio está inscripto, darlo de baja es cancelar su inscripción.
  const inscripcion = empresa.estado === "CLIENTE"
    ? empresa.oportunidades.find((o) => o.estado === "GANADA")
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

  return empresasRepo.darDeBaja(id, estado);
}
