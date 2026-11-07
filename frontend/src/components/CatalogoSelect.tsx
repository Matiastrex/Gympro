import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Catalogo, FilaCatalogo, RefCatalogo } from "../types/configuracion";

interface CatalogoSelectProps {
  catalogo: Catalogo;
  /** Id elegido como string ("" = sin elegir), igual que el resto de los formularios. */
  value: string;
  onChange: (value: string) => void;
  /** Valor que ya tenía el registro: si se desactivó, se sigue mostrando para no perderlo al editar. */
  actual?: RefCatalogo | null;
  required?: boolean;
  placeholder?: string;
}

// Cache por catálogo para no repetir el pedido en cada formulario que se abre.
const cache = new Map<Catalogo, Promise<FilaCatalogo[]>>();

export function useCatalogo(catalogo: Catalogo) {
  const [filas, setFilas] = useState<FilaCatalogo[]>([]);
  useEffect(() => {
    let vigente = true;
    if (!cache.has(catalogo)) {
      const pedido = api.get<FilaCatalogo[]>(`/catalogos/${catalogo}`).then((r) => r.data);
      pedido.catch(() => cache.delete(catalogo));
      cache.set(catalogo, pedido);
    }
    cache.get(catalogo)!.then((data) => vigente && setFilas(data)).catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [catalogo]);
  return filas;
}

/** Después de editar un catálogo en Configuración, los selects lo vuelven a pedir. */
export function invalidarCatalogo(catalogo: Catalogo) {
  cache.delete(catalogo);
}

export function CatalogoSelect({ catalogo, value, onChange, actual, required, placeholder = "Sin especificar" }: CatalogoSelectProps) {
  const filas = useCatalogo(catalogo);
  const actualInactivo = actual && !filas.some((f) => f.id === actual.id);

  return (
    <select required={required} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{required ? "Elegir…" : placeholder}</option>
      {actualInactivo && (
        <option value={actual.id}>
          {actual.nombre} (inactivo)
        </option>
      )}
      {filas.map((f) => (
        <option key={f.id} value={f.id}>
          {f.nombre}
        </option>
      ))}
    </select>
  );
}
