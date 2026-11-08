// Espejo de `Paginado<T>` en backend/src/utils/paginacion.ts.
export interface Paginado<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
