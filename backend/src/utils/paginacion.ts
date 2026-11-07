import { z } from "zod";

// Query string `?page=&pageSize=` de cualquier listado paginado.
export const paginacionSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Paginacion = z.infer<typeof paginacionSchema>;

// Forma de respuesta común a todos los listados paginados.
export interface Paginado<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Traduce page/pageSize a los `skip`/`take` de Prisma.
export function skipTake({ page, pageSize }: Paginacion) {
  return { skip: (page - 1) * pageSize, take: pageSize } as const;
}

export function paginado<T>(items: T[], total: number, { page, pageSize }: Paginacion): Paginado<T> {
  return { items, total, page, pageSize };
}
