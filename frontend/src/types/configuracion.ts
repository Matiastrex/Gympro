// Espejo de /api/catalogos, /api/etapas y /api/productos.

/** Catálogos simples (misma forma de fila); coinciden con `:catalogo` de la API. */
export const CATALOGOS = ["origenes", "motivos-perdida", "tipos-actividad"] as const;
export type Catalogo = (typeof CATALOGOS)[number];

export interface FilaCatalogo {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

/** Referencia a un valor de catálogo tal como viene incluido en un registro. */
export type RefCatalogo = Pick<FilaCatalogo, "id" | "nombre">;

export const TIPOS_ETAPA = ["ABIERTA", "GANADA", "PERDIDA", "BAJA"] as const;
export type TipoEtapa = (typeof TIPOS_ETAPA)[number];

export interface Etapa extends FilaCatalogo {
  tipo: TipoEtapa;
  esClasePrueba: boolean;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  /** Prisma devuelve los Decimal como string. */
  precio: string | number | null;
  activo: boolean;
}

/** Secciones de /configuracion/:seccion. */
export const SECCIONES = ["etapas", "productos", "tipos-actividad", "origenes", "motivos-perdida"] as const;
export type Seccion = (typeof SECCIONES)[number];

export const esSeccion = (valor: string | undefined): valor is Seccion =>
  (SECCIONES as readonly string[]).includes(valor ?? "");
