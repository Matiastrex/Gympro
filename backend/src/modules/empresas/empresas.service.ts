import { z } from "zod";
import { ApiError } from "../../utils/apiError";
import * as empresasRepo from "./empresas.repository";

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

export function listar(filtro?: string) {
  return empresasRepo.findAll(filtro);
}

export async function obtener(id: number) {
  const empresa = await empresasRepo.findById(id);
  if (!empresa) throw ApiError.notFound("Empresa no encontrada");
  return empresa;
}

export function crear(data: EmpresaInput) {
  return empresasRepo.create(data as any);
}

export async function actualizar(id: number, data: EmpresaInput) {
  await obtener(id);
  return empresasRepo.update(id, data as any);
}

export async function darDeBaja(id: number) {
  await obtener(id);
  return empresasRepo.darDeBaja(id);
}
