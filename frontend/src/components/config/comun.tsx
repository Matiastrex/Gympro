import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { mensajeDeError } from "../../types/actividades";

/** Lista de una pantalla de configuración (incluye inactivos) con recarga. */
export function useFilas<T>(url: string) {
  const [filas, setFilas] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      const res = await api.get<T[]>(url, { params: { incluirInactivos: true, incluirInactivas: true } });
      setFilas(res.data);
      setError(null);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo cargar la lista"));
    }
  }, [url]);

  useEffect(() => {
    setFilas(null);
    recargar();
  }, [recargar]);

  return { filas, setFilas, error, recargar };
}

/** Mueve un elemento `delta` posiciones (sin salirse de la lista). */
export function mover<T>(lista: readonly T[], indice: number, delta: -1 | 1): T[] {
  const destino = indice + delta;
  if (destino < 0 || destino >= lista.length) return [...lista];
  const copia = [...lista];
  [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
  return copia;
}

export function Interruptor({
  activo,
  onChange,
  etiqueta,
  disabled,
}: {
  activo: boolean;
  onChange: (activo: boolean) => void;
  etiqueta: string;
  disabled?: boolean;
}) {
  return (
    <label className={`switch${activo ? " is-on" : ""}`} title={activo ? "Activo" : "Inactivo"}>
      <input type="checkbox" checked={activo} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={etiqueta} />
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
      <span className="switch-texto">{activo ? "Activo" : "Inactivo"}</span>
    </label>
  );
}

export function Flechas({
  nombre,
  primero,
  ultimo,
  onMover,
}: {
  nombre: string;
  primero: boolean;
  ultimo: boolean;
  onMover: (delta: -1 | 1) => void;
}) {
  return (
    <span className="config-flechas">
      <button type="button" disabled={primero} onClick={() => onMover(-1)} aria-label={`Subir ${nombre}`}>
        ▲
      </button>
      <button type="button" disabled={ultimo} onClick={() => onMover(1)} aria-label={`Bajar ${nombre}`}>
        ▼
      </button>
    </span>
  );
}

/** Nombre editable en la misma fila: Enter o salir del campo guarda, Escape cancela. */
export function NombreEditable({ valor, onGuardar }: { valor: string; onGuardar: (nombre: string) => Promise<void> }) {
  const [texto, setTexto] = useState(valor);
  useEffect(() => setTexto(valor), [valor]);

  async function guardar() {
    const limpio = texto.trim();
    if (!limpio || limpio === valor) {
      setTexto(valor);
      return;
    }
    try {
      await onGuardar(limpio);
    } catch {
      setTexto(valor);
    }
  }

  return (
    <input
      className="config-nombre"
      value={texto}
      aria-label="Nombre"
      onChange={(e) => setTexto(e.target.value)}
      onBlur={guardar}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setTexto(valor);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
