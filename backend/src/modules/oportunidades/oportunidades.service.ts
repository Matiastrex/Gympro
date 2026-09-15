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

export async function actualizar(id: number, data: OportunidadInput) {
  await obtener(id);
  validarRelacionComercial(data);
  return oportunidadesRepo.update(id, data as any);
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

  // Si la nueva etapa es de cierre (Ganada/Perdida), derivamos el estado y
  // la fecha real de cierre automáticamente, tal como exige la consigna.
  const camposDerivados: Prisma.OportunidadUpdateInput = {};
  if (etapaNueva.tipo === "GANADA") {
    camposDerivados.estado = "GANADA";
    camposDerivados.fechaRealCierre = new Date();
  } else if (etapaNueva.tipo === "PERDIDA") {
    if (!params.motivoPerdida) {
      throw ApiError.badRequest("Hay que indicar un motivo de pérdida para cerrar la oportunidad como perdida");
    }
    camposDerivados.estado = "PERDIDA";
    camposDerivados.fechaRealCierre = new Date();
    camposDerivados.motivoPerdida = params.motivoPerdida;
  }

  return oportunidadesRepo.cambiarEtapa({
    oportunidadId: params.oportunidadId,
    etapaAnteriorId: oportunidad.etapaId,
    etapaNuevaId: params.etapaNuevaId,
    usuarioId: params.usuarioId,
    observacion: params.observacion,
    camposDerivados,
  });
}
