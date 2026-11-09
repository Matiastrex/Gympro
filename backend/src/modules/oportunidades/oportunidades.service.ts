import { z } from "zod";
import { Prisma } from "@prisma/client";
import { idQuery, paginacionOpcionalSchema, paginado } from "../../utils/paginacion";
import { ApiError } from "../../utils/apiError";
import { prisma } from "../../config/db";
import * as oportunidadesRepo from "./oportunidades.repository";
import * as catalogosService from "../catalogos/catalogos.service";
import { Actor, alcance, resolverResponsable, verificarAcceso, verificarAccesoRelacion } from "../../utils/permisos";

export const oportunidadSchema = z.object({
  titulo: z.string().min(1, "El título es obligatorio"),
  empresaId: z.number().int().optional().nullable(),
  contactoId: z.number().int().optional().nullable(),
  responsableId: z.number().int().optional().nullable(),
  productoId: z.number().int().optional().nullable(),
  etapaId: z.number().int(),
  valorEstimado: z.number().optional().nullable(),
  probabilidadCierre: z.number().int().min(0).max(100).optional().nullable(),
  fechaEstimadaCierre: z.string().datetime().optional().nullable(),
  origenId: z.number().int().positive().optional().nullable(),
  // Solo al estar en (o pasar a) una etapa de pérdida.
  motivoPerdidaId: z.number().int().positive().optional().nullable(),
  motivoPerdidaDetalle: z.string().trim().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

export type OportunidadInput = z.infer<typeof oportunidadSchema>;

const MOTIVO_OBLIGATORIO = "Elegí el motivo por el que se perdió la oportunidad";
const etapaDesactivada = (nombre: string) => ApiError.badRequest(`La etapa «${nombre}» está desactivada`);

export const listadoSchema = paginacionOpcionalSchema.extend({
  q: z.string().trim().optional(),
  estado: z.enum(["ABIERTA", "GANADA", "PERDIDA", "BAJA"]).optional(),
  etapaId: idQuery,
  responsableId: idQuery,
  origenId: idQuery,
});

export type FiltrosOportunidades = z.infer<typeof listadoSchema>;

// La visibilidad del rol va en su propio AND: para un vendedor, pedir el
// responsableId de otro da un listado vacío, nunca lo ajeno.
export async function listar(filtros: FiltrosOportunidades, actor: Actor) {
  const { page, pageSize, q, estado, etapaId, responsableId, origenId } = filtros;
  const where: Prisma.OportunidadWhereInput = {
    AND: [
      alcance(actor),
      { estado, etapaId, responsableId, origenId },
      q
        ? {
            OR: [
              { titulo: { contains: q } },
              { contacto: { nombre: { contains: q } } },
              { contacto: { apellido: { contains: q } } },
              { empresa: { razonSocial: { contains: q } } },
            ],
          }
        : {},
    ],
  };
  if (!page) return oportunidadesRepo.findAll(where);
  const { items, total } = await oportunidadesRepo.findPaginado(where, { page, pageSize });
  return paginado(items, total, { page, pageSize });
}

// Sin actor no se controla el acceso: es para llamadas internas (p. ej. la
// baja de un contacto/empresa, que ya verificó el permiso sobre la entidad).
export async function obtener(id: number, actor?: Actor) {
  const oportunidad = await oportunidadesRepo.findById(id);
  if (!oportunidad) throw ApiError.notFound("Oportunidad no encontrada");
  if (actor) verificarAcceso(actor, oportunidad, "oportunidad");
  return oportunidad;
}

async function verificarAccesoRelaciones(
  actor: Actor,
  data: OportunidadInput,
  actual?: { empresaId: number | null; contactoId: number | null }
) {
  if (data.empresaId !== actual?.empresaId) await verificarAccesoRelacion(actor, "empresa", data.empresaId);
  if (data.contactoId !== actual?.contactoId) await verificarAccesoRelacion(actor, "contacto", data.contactoId);
}

function validarRelacionComercial(data: OportunidadInput) {
  // Regla de negocio (Módulo 1): una oportunidad debe estar relacionada con
  // una empresa o con un contacto (o ambos), nunca con ninguno de los dos.
  if (!data.empresaId && !data.contactoId) {
    throw ApiError.badRequest("La oportunidad debe relacionarse con una empresa o un contacto");
  }
}

export async function crear(input: OportunidadInput, actor: Actor) {
  validarRelacionComercial(input);
  await verificarAccesoRelaciones(actor, input);
  const data = { ...input, responsableId: await resolverResponsable(actor, input.responsableId) };

  const etapa = await oportunidadesRepo.findEtapaTipo(data.etapaId);
  if (!etapa) throw ApiError.notFound("Etapa no encontrada");
  if (!etapa.activo) throw etapaDesactivada(etapa.nombre);
  await catalogosService.validarSeleccion("origenes", data.origenId);
  if (etapa.tipo === "BAJA") {
    // No existe una "etapa anterior" para una oportunidad recién creada, así
    // que Inscripción cancelada nunca es un destino válido en la creación: solo se llega ahí
    // moviendo una oportunidad que ya estaba en Inscripto (ver cambiarEtapa).
    throw ApiError.badRequest("No se puede crear una oportunidad directamente en la etapa Inscripción cancelada");
  }
  if (etapa.tipo === "PERDIDA") {
    if (!data.motivoPerdidaId) throw ApiError.badRequest(MOTIVO_OBLIGATORIO);
    await catalogosService.validarSeleccion("motivos-perdida", data.motivoPerdidaId);
  }

  if (data.contactoId != null) {
    const contacto = await oportunidadesRepo.findContactoParaCrear(data.contactoId);
    if (contacto?.estado === "CLIENTE") {
      throw ApiError.badRequest("El contacto ya es cliente");
    }
    if (contacto?.oportunidadAbiertaId != null) {
      throw ApiError.badRequest("El contacto ya tiene una oportunidad abierta");
    }
    if (contacto?.empresaId != null) {
      throw ApiError.badRequest("El contacto tiene convenio corporativo");
    }
    if (etapa.esClasePrueba && contacto?.bajaDefinitiva) {
      throw ApiError.badRequest(
        "El contacto tuvo una inscripción cancelada anteriormente y no puede volver a agendar ni realizar una clase de prueba"
      );
    }
  }

  if (data.empresaId != null) {
    const empresa = await oportunidadesRepo.findEmpresaParaCrear(data.empresaId);
    if (empresa?.estado === "CLIENTE") {
      throw ApiError.badRequest("La empresa ya es cliente");
    }
    if (empresa?.oportunidadAbiertaId != null) {
      throw ApiError.badRequest("La empresa ya tiene una oportunidad abierta");
    }
    if (etapa.esClasePrueba && empresa?.bajaDefinitiva) {
      throw ApiError.badRequest(
        "La empresa tuvo una inscripción cancelada anteriormente y no puede volver a agendar ni realizar una clase de prueba"
      );
    }
  }

  const estadoEntidad = etapa.tipo === "GANADA"
    ? "CLIENTE"
    : etapa.tipo === "PERDIDA"
      ? "INACTIVO"
      : "POTENCIAL";

  const estado = etapa.tipo === "GANADA" ? "GANADA" : etapa.tipo === "PERDIDA" ? "PERDIDA" : "ABIERTA";
  const dataConEstado = {
    ...data,
    estado,
    fechaRealCierre: etapa.tipo === "ABIERTA" ? null : new Date(),
    motivoPerdidaId: etapa.tipo === "PERDIDA" ? data.motivoPerdidaId : null,
    motivoPerdidaDetalle: etapa.tipo === "PERDIDA" ? data.motivoPerdidaDetalle || null : null,
  };

  return oportunidadesRepo.create(dataConEstado as any, estadoEntidad, actor.userId);
}

export async function historial(oportunidadId: number, actor: Actor) {
  await obtener(oportunidadId, actor);
  return oportunidadesRepo.findHistorial(oportunidadId);
}

export async function actualizar(id: number, input: OportunidadInput, actor: Actor) {
  const oportunidad = await obtener(id, actor);
  validarRelacionComercial(input);
  await verificarAccesoRelaciones(actor, input, oportunidad);
  const data = {
    ...input,
    responsableId: await resolverResponsable(actor, input.responsableId, oportunidad.responsableId),
  };
  const usuarioId = actor.userId;
  const reasignarEntidadesA = data.responsableId;

  const etapa = await oportunidadesRepo.findEtapaTipo(data.etapaId);
  if (!etapa) throw ApiError.notFound("Etapa no encontrada");
  await catalogosService.validarSeleccion("origenes", data.origenId, oportunidad.origenId);
  if (etapa.tipo === "PERDIDA") {
    if (!data.motivoPerdidaId) throw ApiError.badRequest(MOTIVO_OBLIGATORIO);
    await catalogosService.validarSeleccion("motivos-perdida", data.motivoPerdidaId, oportunidad.motivoPerdidaId);
  }

  const { etapaId, motivoPerdidaId, motivoPerdidaDetalle, ...camposActualizacion } = data;
  const motivo = etapa.tipo === "PERDIDA"
    ? { motivoPerdidaId, motivoPerdidaDetalle: motivoPerdidaDetalle || null }
    : { motivoPerdidaId: null, motivoPerdidaDetalle: null };

  if (etapaId !== oportunidad.etapaId) {
    return cambiarEtapa({
      oportunidadId: id,
      etapaNuevaId: etapaId,
      usuarioId,
      observacion: data.observaciones ?? undefined,
      motivoPerdidaId: motivo.motivoPerdidaId ?? undefined,
      motivoPerdidaDetalle: motivo.motivoPerdidaDetalle ?? undefined,
      camposActualizacion: { ...camposActualizacion, ...motivo },
      reasignarEntidadesA,
    });
  }

  return oportunidadesRepo.update(id, { ...camposActualizacion, ...motivo } as any, reasignarEntidadesA);
}

export function tableroEmbudo(actor: Actor) {
  return oportunidadesRepo.findAgrupadasPorEtapa(alcance(actor));
}

export async function cambiarEtapa(params: {
  oportunidadId: number;
  etapaNuevaId: number;
  usuarioId: number;
  // Presente cuando el pedido viene de la ruta: verifica que pueda moverla.
  actor?: Actor;
  observacion?: string;
  motivoPerdidaId?: number;
  motivoPerdidaDetalle?: string;
  motivoBaja?: string;
  // Estado con el que queda el contacto/empresa al pasar a Inscripción
  // cancelada. Por defecto INACTIVO; la baja desde Contactos/Empresas puede
  // pedir NO_CONTACTAR.
  estadoEntidadBaja?: "INACTIVO" | "NO_CONTACTAR";
  camposActualizacion?: Prisma.OportunidadUncheckedUpdateInput;
  reasignarEntidadesA?: number | null;
}) {
  const oportunidad = await obtener(params.oportunidadId, params.actor);

  const etapaNueva = await prisma.etapa.findUnique({ where: { id: params.etapaNuevaId } });
  if (!etapaNueva) throw ApiError.notFound("Etapa no encontrada");
  if (!etapaNueva.activo) throw etapaDesactivada(etapaNueva.nombre);

  // Regla de negocio: a Inscripción cancelada solo se puede llegar desde Inscripto (la única
  // etapa GANADA), sin importar cuántas etapas GANADA/PERDIDA distintas haya
  // en el futuro. Este chequeo va ANTES del guard de "ya está cerrada": si no,
  // una oportunidad todavía ABIERTA pasaría de largo ese guard y saltaría
  // directo a Inscripción cancelada sin pasar por Inscripto.
  if (etapaNueva.tipo === "BAJA" && oportunidad.etapa.tipo !== "GANADA") {
    throw ApiError.badRequest("Solo se puede cancelar la inscripción de una oportunidad que está en Inscripto");
  }

  const esBajaDesdeInscripto = etapaNueva.tipo === "BAJA" && oportunidad.etapa.tipo === "GANADA";
  if (oportunidad.estado !== "ABIERTA" && !esBajaDesdeInscripto) {
    // Regla de negocio (Módulo 2): una oportunidad cerrada no puede volver a
    // moverse de etapa sin un flujo de autorización, que es parte de la
    // Entrega Final. Por ahora directamente lo bloqueamos (salvo el pasaje
    // Inscripto -> Inscripción cancelada, que es la única transición permitida post-cierre).
    // Inscripción cancelada, igual que Ganada/Perdida, es un estado terminal e irreversible:
    // una vez ahí, no hay vuelta atrás.
    throw ApiError.badRequest("La oportunidad ya está cerrada, no puede cambiar de etapa");
  }

  const motivoPerdida =
    etapaNueva.tipo === "PERDIDA"
      ? params.motivoPerdidaId
        ? await catalogosService.validarSeleccion("motivos-perdida", params.motivoPerdidaId)
        : undefined
      : undefined;
  if (etapaNueva.tipo === "PERDIDA" && !motivoPerdida) throw ApiError.badRequest(MOTIVO_OBLIGATORIO);

  if (etapaNueva.esClasePrueba) {
    if (oportunidad.contacto?.bajaDefinitiva) {
      throw ApiError.badRequest(
        "El contacto tuvo una inscripción cancelada anteriormente y no puede volver a agendar ni realizar una clase de prueba"
      );
    }
    if (oportunidad.empresa?.bajaDefinitiva) {
      throw ApiError.badRequest(
        "La empresa tuvo una inscripción cancelada anteriormente y no puede volver a agendar ni realizar una clase de prueba"
      );
    }
  }

  // Si la nueva etapa es de cierre (Ganada/Perdida/Inscripción cancelada), derivamos el estado
  // y la fecha real de cierre automáticamente, tal como exige la consigna.
  const camposDerivados: Prisma.OportunidadUncheckedUpdateInput = {};
  let observacionHistorial = params.observacion;

  if (etapaNueva.tipo === "GANADA") {
    camposDerivados.estado = "GANADA";
    camposDerivados.fechaRealCierre = new Date();
  } else if (etapaNueva.tipo === "PERDIDA") {
    camposDerivados.estado = "PERDIDA";
    camposDerivados.fechaRealCierre = new Date();
    camposDerivados.motivoPerdidaId = motivoPerdida!.id;
    camposDerivados.motivoPerdidaDetalle = params.motivoPerdidaDetalle || null;
    const motivoTexto = [motivoPerdida!.nombre, params.motivoPerdidaDetalle].filter(Boolean).join(" — ");
    observacionHistorial = [params.observacion, `Motivo de pérdida: ${motivoTexto}`]
      .filter(Boolean)
      .join(" — ");
  } else if (etapaNueva.tipo === "BAJA") {
    camposDerivados.estado = "BAJA";
    // fechaRealCierre ya quedó fijada cuando la oportunidad llegó a Inscripto
    // (fecha en que se ganó la venta) y no debe reescribirse acá: la cancelación es
    // un evento distinto, con su propia fecha.
    camposDerivados.fechaBaja = new Date();
    camposDerivados.motivoBaja = params.motivoBaja ?? null;
    observacionHistorial = [params.observacion, params.motivoBaja && `Motivo de cancelación: ${params.motivoBaja}`]
      .filter(Boolean)
      .join(" — ") || undefined;
  }

  const empresaIdToClear = etapaNueva.tipo !== "ABIERTA" ? oportunidad.empresaId : null;
  const contactoIdToClear = etapaNueva.tipo !== "ABIERTA" ? oportunidad.contactoId : null;
  const estadoEntidad = etapaNueva.tipo === "GANADA"
    ? "CLIENTE"
    : etapaNueva.tipo === "PERDIDA"
      ? "INACTIVO"
      : etapaNueva.tipo === "BAJA"
        ? params.estadoEntidadBaja ?? "INACTIVO"
        : "POTENCIAL";

  return oportunidadesRepo.cambiarEtapa({
    oportunidadId: params.oportunidadId,
    etapaAnteriorId: oportunidad.etapaId,
    etapaNuevaId: params.etapaNuevaId,
    usuarioId: params.usuarioId,
    observacion: observacionHistorial,
    camposDerivados,
    camposActualizacion: params.camposActualizacion,
    empresaIdToClear,
    contactoIdToClear,
    empresaIdToUpdate: oportunidad.empresaId,
    contactoIdToUpdate: oportunidad.contactoId,
    estadoEntidad,
    marcarBajaDefinitiva: etapaNueva.tipo === "BAJA",
    reasignarEntidadesA: params.reasignarEntidadesA,
  });
}

// Da de baja a un socio inscripto: mueve su oportunidad ganada a la etapa
// Inscripción cancelada pasando por cambiarEtapa(), para que se apliquen las
// mismas reglas (bajaDefinitiva, fechaBaja, historial) que desde el embudo.
export async function cancelarInscripcion(params: {
  oportunidadId: number;
  usuarioId: number;
  motivoBaja?: string;
  estadoEntidad: "INACTIVO" | "NO_CONTACTAR";
}) {
  const etapaCancelada = await oportunidadesRepo.findEtapaPorTipo("BAJA");
  if (!etapaCancelada) throw ApiError.notFound("No existe la etapa Inscripción cancelada");
  return cambiarEtapa({
    oportunidadId: params.oportunidadId,
    etapaNuevaId: etapaCancelada.id,
    usuarioId: params.usuarioId,
    motivoBaja: params.motivoBaja,
    estadoEntidadBaja: params.estadoEntidad,
  });
}
