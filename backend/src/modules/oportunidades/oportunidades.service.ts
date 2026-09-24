import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/apiError";
import { prisma } from "../../config/db";
import * as oportunidadesRepo from "./oportunidades.repository";

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
  origen: z.string().optional().nullable(),
  motivoPerdida: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

export type OportunidadInput = z.infer<typeof oportunidadSchema>;

export function listar(filtros: { etapaId?: number; responsableId?: number }) {
  return oportunidadesRepo.findAll(filtros);
}

export async function obtener(id: number) {
  const oportunidad = await oportunidadesRepo.findById(id);
  if (!oportunidad) throw ApiError.notFound("Oportunidad no encontrada");
  return oportunidad;
}

function validarRelacionComercial(data: OportunidadInput) {
  // Regla de negocio (Módulo 1): una oportunidad debe estar relacionada con
  // una empresa o con un contacto (o ambos), nunca con ninguno de los dos.
  if (!data.empresaId && !data.contactoId) {
    throw ApiError.badRequest("La oportunidad debe relacionarse con una empresa o un contacto");
  }
}

export async function crear(data: OportunidadInput, usuarioId: number) {
  validarRelacionComercial(data);

  const etapa = await oportunidadesRepo.findEtapaTipo(data.etapaId);
  if (!etapa) throw ApiError.notFound("Etapa no encontrada");
  if (etapa.tipo === "BAJA") {
    // No existe una "etapa anterior" para una oportunidad recién creada, así
    // que Baja nunca es un destino válido en la creación: solo se llega ahí
    // moviendo una oportunidad que ya estaba en Inscripto (ver cambiarEtapa).
    throw ApiError.badRequest("No se puede crear una oportunidad directamente en la etapa Baja");
  }
  if (etapa.tipo === "PERDIDA" && !data.motivoPerdida) {
    throw ApiError.badRequest("Hay que indicar un motivo para cerrar la oportunidad");
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
        "El contacto fue dado de baja anteriormente y no puede volver a agendar ni realizar una clase de prueba"
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
        "La empresa fue dada de baja anteriormente y no puede volver a agendar ni realizar una clase de prueba"
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
    motivoPerdida: etapa.tipo === "PERDIDA" ? data.motivoPerdida : null,
  };

  return oportunidadesRepo.create(dataConEstado as any, estadoEntidad, usuarioId);
}

export async function historial(oportunidadId: number) {
  await obtener(oportunidadId);
  return oportunidadesRepo.findHistorial(oportunidadId);
}

export async function actualizar(id: number, data: OportunidadInput, usuarioId: number) {
  const oportunidad = await obtener(id);
  validarRelacionComercial(data);

  const etapa = await oportunidadesRepo.findEtapaTipo(data.etapaId);
  if (!etapa) throw ApiError.notFound("Etapa no encontrada");
  if (etapa.tipo == "PERDIDA" && !data.motivoPerdida) {
    throw ApiError.badRequest("Hay que indicar un motivo para cerrar la oportunidad");
  }

  const { etapaId, motivoPerdida, ...camposActualizacion } = data;
  const motivo = etapa.tipo === "PERDIDA" ? motivoPerdida : null;

  if (etapaId !== oportunidad.etapaId) {
    return cambiarEtapa({
      oportunidadId: id,
      etapaNuevaId: etapaId,
      usuarioId,
      observacion: data.observaciones ?? undefined,
      motivoPerdida: motivo ?? undefined,
      camposActualizacion: { ...camposActualizacion, motivoPerdida: motivo },
    });
  }

  return oportunidadesRepo.update(id, { ...camposActualizacion, motivoPerdida: motivo } as any);
}

export function tableroEmbudo() {
  return oportunidadesRepo.findAgrupadasPorEtapa();
}

export async function cambiarEtapa(params: {
  oportunidadId: number;
  etapaNuevaId: number;
  usuarioId: number;
  observacion?: string;
  motivoPerdida?: string;
  motivoBaja?: string;
  camposActualizacion?: Prisma.OportunidadUncheckedUpdateInput;
}) {
  const oportunidad = await obtener(params.oportunidadId);

  const etapaNueva = await prisma.etapa.findUnique({ where: { id: params.etapaNuevaId } });
  if (!etapaNueva) throw ApiError.notFound("Etapa no encontrada");

  // Regla de negocio: a Baja solo se puede llegar desde Inscripto (la única
  // etapa GANADA), sin importar cuántas etapas GANADA/PERDIDA distintas haya
  // en el futuro. Este chequeo va ANTES del guard de "ya está cerrada": si no,
  // una oportunidad todavía ABIERTA pasaría de largo ese guard y saltaría
  // directo a Baja sin pasar por Inscripto.
  if (etapaNueva.tipo === "BAJA" && oportunidad.etapa.tipo !== "GANADA") {
    throw ApiError.badRequest("Solo se puede dar de baja una oportunidad que está en Inscripto");
  }

  const entrandoABaja = etapaNueva.tipo === "BAJA" && oportunidad.etapa.tipo === "GANADA";
  // Baja es la única etapa cerrada desde la que se permite reabrir: un socio
  // dado de baja puede volver a consultar/negociar/inscribirse (nunca a una
  // clase de prueba, bloqueado más abajo por el chequeo de esClasePrueba).
  const saliendoDeBaja = oportunidad.etapa.tipo === "BAJA" && etapaNueva.tipo !== "BAJA";
  if (oportunidad.estado !== "ABIERTA" && !entrandoABaja && !saliendoDeBaja) {
    // Regla de negocio (Módulo 2): una oportunidad cerrada no puede volver a
    // moverse de etapa sin un flujo de autorización, que es parte de la
    // Entrega Final. Por ahora directamente lo bloqueamos (salvo los pasajes
    // Inscripto -> Baja y Baja -> cualquier otra etapa).
    throw ApiError.badRequest("La oportunidad ya está cerrada, no puede cambiar de etapa");
  }

  if (etapaNueva.tipo == "PERDIDA" && !params.motivoPerdida) {
    throw ApiError.badRequest("Hay que indicar un motivo para cerrar la oportunidad");
  }

  if (etapaNueva.esClasePrueba) {
    if (oportunidad.contacto?.bajaDefinitiva) {
      throw ApiError.badRequest(
        "El contacto fue dado de baja anteriormente y no puede volver a agendar ni realizar una clase de prueba"
      );
    }
    if (oportunidad.empresa?.bajaDefinitiva) {
      throw ApiError.badRequest(
        "La empresa fue dada de baja anteriormente y no puede volver a agendar ni realizar una clase de prueba"
      );
    }
  }

  // Si la nueva etapa es de cierre (Ganada/Perdida/Baja), derivamos el estado
  // y la fecha real de cierre automáticamente, tal como exige la consigna.
  const camposDerivados: Prisma.OportunidadUncheckedUpdateInput = {};
  if (etapaNueva.tipo === "GANADA") {
    camposDerivados.estado = "GANADA";
    camposDerivados.fechaRealCierre = new Date();
  } else if (etapaNueva.tipo === "PERDIDA") {
    camposDerivados.estado = "PERDIDA";
    camposDerivados.fechaRealCierre = new Date();
    camposDerivados.motivoPerdida = params.motivoPerdida;
  } else if (etapaNueva.tipo === "BAJA") {
    camposDerivados.estado = "BAJA";
    // fechaRealCierre ya quedó fijada cuando la oportunidad llegó a Inscripto
    // (fecha en que se ganó la venta) y no debe reescribirse acá: la baja es
    // un evento distinto, con su propia fecha.
    camposDerivados.fechaBaja = new Date();
    camposDerivados.motivoBaja = params.motivoBaja ?? null;
  } else {
    // ABIERTA: sin esto, reabrir desde Baja dejaría el estado en "BAJA" para
    // siempre (los movimientos normales abierta->abierta ya tenían estado
    // "ABIERTA", así que esto es un no-op para ellos).
    camposDerivados.estado = "ABIERTA";
  }

  // Al reabrir desde Baja hacia una etapa abierta, el contacto/empresa vuelve
  // a tener una oportunidad en curso: hay que restaurar oportunidadAbiertaId
  // (se había limpiado al entrar a Baja), o el sistema dejaría crear una
  // segunda oportunidad abierta en paralelo para la misma persona/empresa.
  const reabriendo = saliendoDeBaja && etapaNueva.tipo === "ABIERTA";

  const empresaIdToClear = etapaNueva.tipo !== "ABIERTA" ? oportunidad.empresaId : null;
  const contactoIdToClear = etapaNueva.tipo !== "ABIERTA" ? oportunidad.contactoId : null;
  const empresaIdToRestore = reabriendo ? oportunidad.empresaId : null;
  const contactoIdToRestore = reabriendo ? oportunidad.contactoId : null;
  const estadoEntidad = etapaNueva.tipo === "GANADA"
    ? "CLIENTE"
    : etapaNueva.tipo === "PERDIDA"
      ? "INACTIVO"
      : etapaNueva.tipo === "BAJA"
        ? "INACTIVO"
        : "POTENCIAL";

  return oportunidadesRepo.cambiarEtapa({
    oportunidadId: params.oportunidadId,
    etapaAnteriorId: oportunidad.etapaId,
    etapaNuevaId: params.etapaNuevaId,
    usuarioId: params.usuarioId,
    observacion: params.observacion,
    camposDerivados,
    camposActualizacion: params.camposActualizacion,
    empresaIdToClear,
    contactoIdToClear,
    empresaIdToRestore,
    contactoIdToRestore,
    empresaIdToUpdate: oportunidad.empresaId,
    contactoIdToUpdate: oportunidad.contactoId,
    estadoEntidad,
    marcarBajaDefinitiva: etapaNueva.tipo === "BAJA",
  });
}
