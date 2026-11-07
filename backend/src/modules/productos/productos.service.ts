import { z } from "zod";
import { ApiError } from "../../utils/apiError";
import { Actor } from "../../utils/permisos";
import * as productosRepo from "./productos.repository";

// Productos = planes de membresía que el gimnasio vende a sus socios.
export const productoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  descripcion: z.string().trim().optional().nullable(),
  precio: z.number().min(0, "El precio no puede ser negativo").optional().nullable(),
  activo: z.boolean().optional(),
});

export type ProductoInput = z.infer<typeof productoSchema>;

export function listar(incluirInactivos: boolean, actor: Actor) {
  return productosRepo.findAll(incluirInactivos && actor.rol === "ADMINISTRADOR");
}

export function crear(data: ProductoInput) {
  return productosRepo.create({ ...data, descripcion: data.descripcion || null });
}

// Sin borrado: un plan que se deja de vender se desactiva y las oportunidades viejas lo conservan.
export async function actualizar(id: number, data: ProductoInput) {
  if (!(await productosRepo.findById(id))) throw ApiError.notFound("Producto no encontrado");
  return productosRepo.update(id, { ...data, descripcion: data.descripcion || null });
}
