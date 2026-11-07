import { z } from "zod";
import { ApiError } from "../../utils/apiError";
import { Actor } from "../../utils/permisos";
import * as catalogosRepo from "./catalogos.repository";
import { CATALOGOS, Catalogo } from "./catalogos.repository";

export type { Catalogo };

const catalogoSchema = z.enum(CATALOGOS);

/** Valida el `:catalogo` de la URL; uno que no existe es un 404, no un 400. */
export function catalogoDeRuta(valor: string): Catalogo {
  const resultado = catalogoSchema.safeParse(valor);
  if (!resultado.success) throw ApiError.notFound(`No existe el catálogo «${valor}»`);
  return resultado.data;
}

const nombre = z.string().trim().min(1, "El nombre es obligatorio").max(80, "Máximo 80 caracteres");

export const crearSchema = z.object({ nombre });
export const actualizarSchema = z
  .object({ nombre: nombre.optional(), activo: z.boolean().optional() })
  .refine((d) => d.nombre !== undefined || d.activo !== undefined, { message: "No hay nada para cambiar" });
export const reordenarSchema = z.object({ ids: z.array(z.number().int().positive()).min(1) });

const SINGULAR: Record<Catalogo, string> = {
  origenes: "El origen",
  "motivos-perdida": "El motivo de pérdida",
  "tipos-actividad": "El tipo de actividad",
};

export function listar(catalogo: Catalogo, incluirInactivos: boolean, actor: Actor) {
  return catalogosRepo.findAll(catalogo, incluirInactivos && actor.rol === "ADMINISTRADOR");
}

export async function crear(catalogo: Catalogo, data: z.infer<typeof crearSchema>) {
  return catalogosRepo.create(catalogo, { nombre: data.nombre, orden: await catalogosRepo.siguienteOrden(catalogo) });
}

export async function actualizar(catalogo: Catalogo, id: number, data: z.infer<typeof actualizarSchema>) {
  const actual = await catalogosRepo.findById(catalogo, id);
  if (!actual) throw ApiError.notFound(`${SINGULAR[catalogo]} no existe`);
  if (data.activo === false && actual.activo && (await catalogosRepo.contarOtrosActivos(catalogo, id)) === 0) {
    throw ApiError.badRequest("Tiene que quedar al menos uno activo");
  }
  return catalogosRepo.update(catalogo, id, data);
}

export async function reordenar(catalogo: Catalogo, ids: number[]) {
  await catalogosRepo.reordenar(catalogo, ids);
  return catalogosRepo.findAll(catalogo, true);
}

/**
 * Para los formularios que eligen un valor de catálogo: tiene que existir y
 * estar activo. Si no cambió respecto del valor guardado, se acepta aunque se
 * haya desactivado después (editar un registro viejo no lo obliga a cambiarlo).
 */
export async function validarSeleccion(catalogo: Catalogo, id: number | null | undefined, actual?: number | null) {
  if (id == null || id === actual) return;
  const fila = await catalogosRepo.findById(catalogo, id);
  if (!fila) throw ApiError.notFound(`${SINGULAR[catalogo]} no existe`);
  if (!fila.activo) throw ApiError.badRequest(`${SINGULAR[catalogo]} «${fila.nombre}» está desactivado`);
  return fila;
}
