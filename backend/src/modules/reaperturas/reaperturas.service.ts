import { z } from "zod";
import { ApiError } from "../../utils/apiError";
import { Actor } from "../../utils/permisos";
import * as reaperturasRepo from "./reaperturas.repository";
import * as oportunidadesService from "../oportunidades/oportunidades.service";
import * as oportunidadesRepo from "../oportunidades/oportunidades.repository";

export const solicitudSchema = z.object({
  etapaDestinoId: z.number().int().positive({ message: "Elegí la etapa a la que vuelve" }),
  motivo: z.string().trim().min(1, "Explicá por qué hay que reabrirla"),
});

export const rechazoSchema = z.object({
  comentario: z.string().trim().min(1, "Contale al solicitante por qué se rechaza"),
});

export const listadoSchema = z.object({
  estado: z.enum(["PENDIENTE", "APROBADA", "RECHAZADA"]).optional(),
});

export type SolicitudInput = z.infer<typeof solicitudSchema>;

type Oportunidad = Awaited<ReturnType<typeof oportunidadesService.obtener>>;

const nombre = (u: { nombre: string; apellido: string }) => `${u.nombre} ${u.apellido}`;

// Reglas que tienen que valer al pedir Y al aprobar (entre una cosa y la
// otra pudo cambiar el estado del contacto/empresa).
async function validarReapertura(oportunidad: Oportunidad, etapaDestinoId: number) {
  if (oportunidad.estado !== "PERDIDA") {
    throw ApiError.badRequest("Solo se puede reabrir una oportunidad perdida");
  }

  const etapa = await reaperturasRepo.findEtapa(etapaDestinoId);
  if (!etapa) throw ApiError.notFound("Etapa no encontrada");
  if (etapa.tipo !== "ABIERTA") throw ApiError.badRequest("La oportunidad tiene que volver a una etapa abierta");
  if (etapa.esClasePrueba && (oportunidad.contacto?.bajaDefinitiva || oportunidad.empresa?.bajaDefinitiva)) {
    throw ApiError.badRequest(
      "Tuvo una inscripción cancelada anteriormente y no puede volver a una etapa de clase de prueba"
    );
  }

  // Mismas reglas que al crear una oportunidad: una sola abierta por socio/convenio.
  if (oportunidad.contactoId != null) {
    const contacto = await oportunidadesRepo.findContactoParaCrear(oportunidad.contactoId);
    if (contacto?.estado === "CLIENTE") throw ApiError.badRequest("El contacto ya es cliente");
    if (contacto?.oportunidadAbiertaId != null) throw ApiError.badRequest("El contacto ya tiene otra oportunidad abierta");
  }
  if (oportunidad.empresaId != null) {
    const empresa = await oportunidadesRepo.findEmpresaParaCrear(oportunidad.empresaId);
    if (empresa?.estado === "CLIENTE") throw ApiError.badRequest("La empresa ya es cliente");
    if (empresa?.oportunidadAbiertaId != null) throw ApiError.badRequest("La empresa ya tiene otra oportunidad abierta");
  }
  return etapa;
}

/**
 * Vendedor / responsable comercial: crea la solicitud y avisa a los admins.
 * Administrador: él es quien autoriza, así que reabre directamente.
 */
export async function solicitar(oportunidadId: number, input: SolicitudInput, actor: Actor) {
  const oportunidad = await oportunidadesService.obtener(oportunidadId, actor);
  const etapa = await validarReapertura(oportunidad, input.etapaDestinoId);
  if (await reaperturasRepo.findPendiente(oportunidadId)) {
    throw ApiError.badRequest("Ya hay un pedido de reapertura pendiente para esta oportunidad");
  }
  const solicitante = await reaperturasRepo.findUsuario(actor.userId);
  if (!solicitante) throw ApiError.unauthorized();

  if (actor.rol === "ADMINISTRADOR") {
    await reaperturasRepo.reabrir({
      oportunidadId,
      etapaAnteriorId: oportunidad.etapaId,
      etapaDestinoId: etapa.id,
      empresaId: oportunidad.empresaId,
      contactoId: oportunidad.contactoId,
      adminId: actor.userId,
      observacion: `Reabierta por ${nombre(solicitante)}: ${input.motivo}`,
    });
    return { reabierta: true as const };
  }

  const admins = await reaperturasRepo.findAdminsActivos();
  const solicitud = await reaperturasRepo.crearSolicitud(
    { oportunidadId, etapaDestinoId: etapa.id, solicitanteId: actor.userId, motivo: input.motivo },
    admins.map((usuarioId) => ({
      usuarioId,
      tipo: "REAPERTURA_SOLICITADA" as const,
      oportunidadId,
      mensaje: `${nombre(solicitante)} pidió reabrir «${oportunidad.titulo}» en ${etapa.nombre}.`,
    }))
  );
  return { reabierta: false as const, solicitud };
}

async function obtenerPendiente(id: number) {
  const solicitud = await reaperturasRepo.findById(id);
  if (!solicitud) throw ApiError.notFound("Solicitud no encontrada");
  if (solicitud.estado !== "PENDIENTE") throw ApiError.badRequest("La solicitud ya fue resuelta");
  return solicitud;
}

export async function aprobar(id: number, actor: Actor) {
  const solicitud = await obtenerPendiente(id);
  // Sin actor: el admin ya está autorizado por la ruta (requireRole).
  const oportunidad = await oportunidadesService.obtener(solicitud.oportunidadId);
  await validarReapertura(oportunidad, solicitud.etapaDestinoId);
  const admin = await reaperturasRepo.findUsuario(actor.userId);
  if (!admin) throw ApiError.unauthorized();

  await reaperturasRepo.reabrir({
    oportunidadId: oportunidad.id,
    etapaAnteriorId: oportunidad.etapaId,
    etapaDestinoId: solicitud.etapaDestinoId,
    empresaId: oportunidad.empresaId,
    contactoId: oportunidad.contactoId,
    adminId: actor.userId,
    observacion: `Reabierta con autorización de ${nombre(admin)}. Pedido por ${nombre(solicitud.solicitante)}: ${solicitud.motivo}`,
    solicitud: {
      id,
      aviso: {
        usuarioId: solicitud.solicitanteId,
        tipo: "REAPERTURA_APROBADA",
        oportunidadId: oportunidad.id,
        mensaje: `${nombre(admin)} aprobó reabrir «${oportunidad.titulo}». Volvió a ${solicitud.etapaDestino.nombre}.`,
      },
    },
  });
  return reaperturasRepo.findById(id);
}

export async function rechazar(id: number, comentario: string, actor: Actor) {
  const solicitud = await obtenerPendiente(id);
  const admin = await reaperturasRepo.findUsuario(actor.userId);
  if (!admin) throw ApiError.unauthorized();
  return reaperturasRepo.rechazar(id, actor.userId, comentario, {
    usuarioId: solicitud.solicitanteId,
    tipo: "REAPERTURA_RECHAZADA",
    oportunidadId: solicitud.oportunidadId,
    mensaje: `${nombre(admin)} rechazó reabrir «${solicitud.oportunidad.titulo}»: ${comentario}`,
  });
}

// El admin ve todas; el resto, las que pidió.
export function listar(estado: z.infer<typeof listadoSchema>["estado"], actor: Actor) {
  return reaperturasRepo.findMany({
    estado,
    ...(actor.rol === "ADMINISTRADOR" ? {} : { solicitanteId: actor.userId }),
  });
}
