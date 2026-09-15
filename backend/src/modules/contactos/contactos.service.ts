import { z } from "zod";
import { ApiError } from "../../utils/apiError";
import * as contactosRepo from "./contactos.repository";

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

export async function darDeBaja(id: number) {
  await obtener(id);
  return contactosRepo.darDeBaja(id);
}
