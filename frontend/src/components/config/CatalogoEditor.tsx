import { FormEvent, useState } from "react";
import { api } from "../../api/client";
import { invalidarCatalogo } from "../CatalogoSelect";
import { mensajeDeError } from "../../types/actividades";
import type { Catalogo, FilaCatalogo } from "../../types/configuracion";
import { Flechas, Interruptor, NombreEditable, mover, useFilas } from "./comun";

interface CatalogoEditorProps {
  catalogo: Catalogo;
  /** "origen", "motivo"… para los textos de la pantalla. */
  singular: string;
  placeholder: string;
}

/** Orígenes, motivos de pérdida y tipos de actividad: misma lista editable. */
export function CatalogoEditor({ catalogo, singular, placeholder }: CatalogoEditorProps) {
  const url = `/catalogos/${catalogo}`;
  const { filas, error: errorCarga, recargar } = useFilas<FilaCatalogo>(url);
  const [nuevo, setNuevo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activos = (filas ?? []).filter((f) => f.activo);
  const inactivos = (filas ?? []).filter((f) => !f.activo);

  async function ejecutar(accion: () => Promise<unknown>, porDefecto: string) {
    setError(null);
    try {
      await accion();
      invalidarCatalogo(catalogo);
      await recargar();
    } catch (err) {
      setError(mensajeDeError(err, porDefecto));
      throw err;
    }
  }

  async function agregar(e: FormEvent) {
    e.preventDefault();
    if (!nuevo.trim()) return;
    await ejecutar(() => api.post(url, { nombre: nuevo }), `No se pudo agregar el ${singular}`).then(
      () => setNuevo(""),
      () => undefined
    );
  }

  const actualizar = (fila: FilaCatalogo, data: Partial<Pick<FilaCatalogo, "nombre" | "activo">>) =>
    ejecutar(() => api.put(`${url}/${fila.id}`, data), `No se pudo guardar el ${singular}`);

  // El orden solo importa entre los activos; los inactivos quedan al final.
  const reordenar = (indice: number, delta: -1 | 1) =>
    ejecutar(
      () => api.post(`${url}/reordenar`, { ids: [...mover(activos, indice, delta), ...inactivos].map((f) => f.id) }),
      "No se pudo reordenar"
    ).catch(() => undefined);

  return (
    <div className="config-editor">
      {(error || errorCarga) && <div className="error-box">{error ?? errorCarga}</div>}
      {filas === null ? (
        <p className="cell-muted">Cargando…</p>
      ) : (
        <ol className="config-lista">
          {[...activos, ...inactivos].map((fila) => {
            const indice = activos.indexOf(fila);
            return (
              <li key={fila.id} className={`config-fila${fila.activo ? "" : " is-inactiva"}`}>
                {fila.activo ? (
                  <Flechas
                    nombre={fila.nombre}
                    primero={indice === 0}
                    ultimo={indice === activos.length - 1}
                    onMover={(delta) => reordenar(indice, delta)}
                  />
                ) : (
                  <span className="config-flechas" aria-hidden="true" />
                )}
                <NombreEditable valor={fila.nombre} onGuardar={(nombre) => actualizar(fila, { nombre })} />
                <Interruptor
                  activo={fila.activo}
                  etiqueta={`${fila.nombre} activo`}
                  onChange={(activo) => actualizar(fila, { activo }).catch(() => undefined)}
                />
              </li>
            );
          })}
        </ol>
      )}
      <form className="config-agregar" onSubmit={agregar}>
        <input value={nuevo} placeholder={placeholder} onChange={(e) => setNuevo(e.target.value)} aria-label={`Nuevo ${singular}`} />
        <button type="submit" className="btn btn-sm" disabled={!nuevo.trim()}>
          Agregar
        </button>
      </form>
      <p className="config-nota">
        Desactivar un {singular} lo saca de los formularios, pero los registros que ya lo usan lo conservan.
      </p>
    </div>
  );
}
