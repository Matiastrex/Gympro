import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Paginado } from "../types/paginacion";

// Filtros de un listado como strings ("" = sin filtrar), igual que los selects.
type Filtros = Record<string, string>;

/**
 * Listado paginado del backend con búsqueda por texto (`q`, con debounce) y
 * filtros. `filtrosVacios` tiene que ser una constante de módulo.
 */
export function useListadoPaginado<T, F extends Filtros>(endpoint: string, filtrosVacios: F, pageSize = 15) {
  const [filtros, setFiltros] = useState<F>(filtrosVacios);
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [datos, setDatos] = useState<Paginado<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  // La búsqueda por texto espera a que se deje de tipear.
  useEffect(() => {
    const texto = busqueda.trim();
    if (texto === q) return;
    const t = setTimeout(() => {
      setQ(texto);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [busqueda, q]);

  useEffect(() => {
    // Si cambian los filtros antes de que llegue la respuesta, se descarta la vieja.
    let vigente = true;
    const conValor = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ""));
    api
      .get<Paginado<T>>(endpoint, { params: { page, pageSize, q: q || undefined, ...conValor } })
      .then((res) => {
        if (!vigente) return;
        // Si la página quedó vacía (p. ej. el último registro salió del filtro), ir a la última.
        if (res.data.items.length === 0 && page > 1) {
          setPage(Math.max(1, Math.ceil(res.data.total / pageSize)));
          return;
        }
        setDatos(res.data);
        setError(null);
      })
      .catch(() => vigente && setError("No se pudo cargar el listado"));
    return () => {
      vigente = false;
    };
  }, [endpoint, filtros, q, page, pageSize, recarga]);

  function cambiar<K extends keyof F>(clave: K, valor: F[K]) {
    setFiltros((f) => ({ ...f, [clave]: valor }));
    setPage(1);
  }

  function limpiar() {
    setBusqueda("");
    setQ("");
    setFiltros(filtrosVacios);
    setPage(1);
  }

  const hayFiltros = busqueda.trim() !== "" || Object.values(filtros).some((v) => v !== "");

  return {
    items: datos?.items ?? [],
    cargado: datos !== null,
    total: datos?.total ?? 0,
    page,
    pageSize,
    setPage,
    filtros,
    cambiar,
    busqueda,
    setBusqueda,
    hayFiltros,
    limpiar,
    error,
    recargar: () => setRecarga((n) => n + 1),
  };
}
