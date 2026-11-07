import { z } from "zod";
import { TipoEtapa } from "@prisma/client";
import { ApiError } from "../../utils/apiError";
import { Actor } from "../../utils/permisos";
import * as etapasRepo from "./etapas.repository";

const TIPOS = ["ABIERTA", "GANADA", "PERDIDA", "BAJA"] as const satisfies readonly TipoEtapa[];

// Cómo se nombra cada tipo en los mensajes (el embudo del gimnasio).
const TIPO_LABEL = {
  ABIERTA: "abierta",
  GANADA: "de inscripción (ganada)",
  PERDIDA: "de pérdida",
  BAJA: "de inscripción cancelada",
} as const satisfies Record<TipoEtapa, string>;

const nombre = z.string().trim().min(1, "El nombre es obligatorio").max(80, "Máximo 80 caracteres");

export const crearSchema = z.object({
  nombre,
  tipo: z.enum(TIPOS),
  esClasePrueba: z.boolean().optional(),
});

export const actualizarSchema = z.object({
  nombre: nombre.optional(),
  tipo: z.enum(TIPOS).optional(),
  esClasePrueba: z.boolean().optional(),
  activo: z.boolean().optional(),
});

export const reordenarSchema = z.object({ ids: z.array(z.number().int().positive()).min(1) });

export function listar(incluirInactivas: boolean, actor: Actor) {
  return etapasRepo.findAll(incluirInactivas && actor.rol === "ADMINISTRADOR");
}

// "Clase de prueba" solo tiene sentido en una etapa abierta.
const clasePrueba = (tipo: TipoEtapa, pedido?: boolean) => (tipo === "ABIERTA" ? Boolean(pedido) : false);

export async function crear(data: z.infer<typeof crearSchema>) {
  return etapasRepo.create({
    nombre: data.nombre,
    tipo: data.tipo,
    esClasePrueba: clasePrueba(data.tipo, data.esClasePrueba),
    orden: await etapasRepo.siguienteOrden(),
  });
}

/**
 * Reglas para no dejar el embudo inconsistente:
 * - siempre al menos una etapa activa de cada tipo (crear, cerrar, cancelar
 *   inscripción y reabrir dependen de ellas);
 * - una etapa con oportunidades no cambia de tipo ni se desactiva (su estado
 *   quedaría en contradicción con la etapa / la tarjeta desaparecería del tablero).
 */
export async function actualizar(id: number, data: z.infer<typeof actualizarSchema>) {
  const etapa = await etapasRepo.findById(id);
  if (!etapa) throw ApiError.notFound("Etapa no encontrada");

  const tipo = data.tipo ?? etapa.tipo;
  const cambiaTipo = tipo !== etapa.tipo;
  const seDesactiva = data.activo === false && etapa.activo;

  if (cambiaTipo || seDesactiva) {
    const enUso = await etapasRepo.contarOportunidades(id);
    if (enUso > 0) {
      const accion = seDesactiva ? "desactivarla" : "cambiarle el tipo";
      throw ApiError.badRequest(
        `«${etapa.nombre}» tiene ${enUso} ${enUso === 1 ? "oportunidad" : "oportunidades"}: movelas a otra etapa antes de ${accion}`
      );
    }
    if (etapa.activo && (await etapasRepo.contarActivasDelTipo(etapa.tipo, id)) === 0) {
      throw ApiError.badRequest(`Tiene que quedar al menos una etapa ${TIPO_LABEL[etapa.tipo]} activa`);
    }
  }

  return etapasRepo.update(id, {
    nombre: data.nombre,
    tipo,
    activo: data.activo,
    esClasePrueba: clasePrueba(tipo, data.esClasePrueba ?? etapa.esClasePrueba),
  });
}

export async function reordenar(ids: number[]) {
  await etapasRepo.reordenar(ids);
  return etapasRepo.findAll(true);
}
