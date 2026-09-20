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

export function crear(data: OportunidadInput) {
  validarRelacionComercial(data);
  return oportunidadesRepo.create(data as any);
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
  camposActualizacion?: Prisma.OportunidadUncheckedUpdateInput;
}) {
  const oportunidad = await obtener(params.oportunidadId);

  if (oportunidad.estado !== "ABIERTA") {
    // Regla de negocio (Módulo 2): una oportunidad cerrada no puede volver a
    // moverse de etapa sin un flujo de autorización, que es parte de la
    // Entrega Final. Por ahora directamente lo bloqueamos.
    throw ApiError.badRequest("La oportunidad ya está cerrada, no puede cambiar de etapa");
  }

  const etapaNueva = await prisma.etapa.findUnique({ where: { id: params.etapaNuevaId } });
  if (!etapaNueva) throw ApiError.notFound("Etapa no encontrada");
  if (etapaNueva.tipo == "PERDIDA" && !params.motivoPerdida) {
    throw ApiError.badRequest("Hay que indicar un motivo para cerrar la oportunidad");
  }

  // Si la nueva etapa es de cierre (Ganada/Perdida), derivamos el estado y
  // la fecha real de cierre automáticamente, tal como exige la consigna.
  const camposDerivados: Prisma.OportunidadUncheckedUpdateInput = {};
  if (etapaNueva.tipo === "GANADA") {
    camposDerivados.estado = "GANADA";
    camposDerivados.fechaRealCierre = new Date();
  } else if (etapaNueva.tipo === "PERDIDA") {
    camposDerivados.estado = "PERDIDA";
    camposDerivados.fechaRealCierre = new Date();
    camposDerivados.motivoPerdida = params.motivoPerdida;
  }

  const empresaIdToClear = etapaNueva.tipo !== "ABIERTA" ? oportunidad.empresaId : null;
  const contactoIdToClear = etapaNueva.tipo !== "ABIERTA" ? oportunidad.contactoId : null;

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
  });
}
