import { FormEvent, Fragment, useState } from "react";
import { api } from "../../api/client";
import { mensajeDeError } from "../../types/actividades";
import { TIPOS_ETAPA, type Etapa, type TipoEtapa } from "../../types/configuracion";
import { Flechas, Interruptor, NombreEditable, mover, useFilas } from "./comun";

const TIPO = {
  ABIERTA: { label: "Abierta", ayuda: "Paso del proceso" },
  GANADA: { label: "Inscripto (ganada)", ayuda: "Cierra la oportunidad como ganada" },
  PERDIDA: { label: "Perdida", ayuda: "Cierra la oportunidad y pide motivo" },
  BAJA: { label: "Inscripción cancelada", ayuda: "Solo se llega desde una ganada" },
} as const satisfies Record<TipoEtapa, { label: string; ayuda: string }>;

type CambioEtapa = Partial<Pick<Etapa, "nombre" | "tipo" | "esClasePrueba" | "activo">>;

export function EtapasEditor() {
  const { filas, error: errorCarga, recargar } = useFilas<Etapa>("/etapas");
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState<{ nombre: string; tipo: TipoEtapa }>({ nombre: "", tipo: "ABIERTA" });

  const activas = (filas ?? []).filter((e) => e.activo);
  const inactivas = (filas ?? []).filter((e) => !e.activo);

  async function ejecutar(accion: () => Promise<unknown>, porDefecto: string) {
    setError(null);
    try {
      await accion();
      await recargar();
    } catch (err) {
      setError(mensajeDeError(err, porDefecto));
      throw err;
    }
  }

  const actualizar = (etapa: Etapa, data: CambioEtapa) =>
    ejecutar(() => api.put(`/etapas/${etapa.id}`, data), "No se pudo guardar la etapa");

  const reordenar = (indice: number, delta: -1 | 1) =>
    ejecutar(
      () => api.post("/etapas/reordenar", { ids: [...mover(activas, indice, delta), ...inactivas].map((e) => e.id) }),
      "No se pudo reordenar"
    ).catch(() => undefined);

  async function agregar(e: FormEvent) {
    e.preventDefault();
    if (!nueva.nombre.trim()) return;
    await ejecutar(() => api.post("/etapas", nueva), "No se pudo crear la etapa").then(
      () => setNueva({ nombre: "", tipo: "ABIERTA" }),
      () => undefined
    );
  }

  return (
    <div className="config-editor">
      <VistaEmbudo etapas={activas} />

      {(error || errorCarga) && <div className="error-box">{error ?? errorCarga}</div>}
      {filas === null ? (
        <p className="cell-muted">Cargando…</p>
      ) : (
        <ol className="config-lista">
          {[...activas, ...inactivas].map((etapa) => {
            const indice = activas.indexOf(etapa);
            return (
              <li key={etapa.id} className={`config-fila config-fila-etapa${etapa.activo ? "" : " is-inactiva"}`}>
                {etapa.activo ? (
                  <Flechas
                    nombre={etapa.nombre}
                    primero={indice === 0}
                    ultimo={indice === activas.length - 1}
                    onMover={(delta) => reordenar(indice, delta)}
                  />
                ) : (
                  <span className="config-flechas" aria-hidden="true" />
                )}
                <NombreEditable valor={etapa.nombre} onGuardar={(nombre) => actualizar(etapa, { nombre })} />
                <span className="config-tipo">
                  <i className={`etapa-dot is-${etapa.tipo.toLowerCase()}`} aria-hidden="true" />
                  <select
                    value={etapa.tipo}
                    aria-label={`Tipo de ${etapa.nombre}`}
                    title={TIPO[etapa.tipo].ayuda}
                    onChange={(e) => actualizar(etapa, { tipo: e.target.value as TipoEtapa }).catch(() => undefined)}
                  >
                    {TIPOS_ETAPA.map((t) => (
                      <option key={t} value={t}>
                        {TIPO[t].label}
                      </option>
                    ))}
                  </select>
                </span>
                <label className={`config-check${etapa.tipo === "ABIERTA" ? "" : " is-oculto"}`}>
                  <input
                    type="checkbox"
                    checked={etapa.esClasePrueba}
                    disabled={etapa.tipo !== "ABIERTA"}
                    onChange={(e) => actualizar(etapa, { esClasePrueba: e.target.checked }).catch(() => undefined)}
                  />
                  Clase de prueba
                </label>
                <Interruptor
                  activo={etapa.activo}
                  etiqueta={`${etapa.nombre} activa`}
                  onChange={(activo) => actualizar(etapa, { activo }).catch(() => undefined)}
                />
              </li>
            );
          })}
        </ol>
      )}

      <form className="config-agregar" onSubmit={agregar}>
        <input
          value={nueva.nombre}
          placeholder="Nueva etapa, ej.: Evaluación física"
          onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
          aria-label="Nombre de la nueva etapa"
        />
        <select value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value as TipoEtapa })} aria-label="Tipo de la nueva etapa">
          {TIPOS_ETAPA.map((t) => (
            <option key={t} value={t}>
              {TIPO[t].label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-sm" disabled={!nueva.nombre.trim()}>
          Agregar
        </button>
      </form>
      <p className="config-nota">
        Una etapa con oportunidades no se puede desactivar ni cambiar de tipo, y siempre tiene que quedar al menos una
        activa de cada tipo. Las de clase de prueba no admiten socios con una inscripción cancelada.
      </p>
    </div>
  );
}

/** El embudo tal como lo ven los vendedores: los pasos en orden y, aparte, los cierres. */
function VistaEmbudo({ etapas }: { etapas: Etapa[] }) {
  const pasos = etapas.filter((e) => e.tipo === "ABIERTA");
  const cierres = etapas.filter((e) => e.tipo !== "ABIERTA");
  return (
    <figure className="embudo-preview" aria-label="Vista previa del embudo">
      <div className="embudo-preview-pasos">
        {pasos.map((e, i) => (
          <Fragment key={e.id}>
            {i > 0 && <span className="embudo-preview-flecha" aria-hidden="true" />}
            <span className="embudo-preview-paso">
              <small>{i + 1}</small>
              {e.nombre}
              {e.esClasePrueba && <em>clase de prueba</em>}
            </span>
          </Fragment>
        ))}
      </div>
      <div className="embudo-preview-cierres">
        <span className="embudo-preview-label">Cierres</span>
        {cierres.map((e) => (
          <span key={e.id} className={`embudo-preview-cierre is-${e.tipo.toLowerCase()}`}>
            {e.nombre}
          </span>
        ))}
      </div>
    </figure>
  );
}
