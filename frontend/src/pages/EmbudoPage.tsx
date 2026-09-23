import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Avatar } from "../components/Avatar";
import { Badge } from "../components/Badge";
import { HistorialEtapas, HistorialEtapaItem } from "../components/HistorialEtapas";

interface Etapa {
  id: number;
  nombre: string;
  orden: number;
  tipo: "ABIERTA" | "GANADA" | "PERDIDA";
}

interface Oportunidad {
  id: number;
  titulo: string;
  estado: string;
  valorEstimado?: number | null;
  probabilidadCierre?: number | null;
  fechaEstimadaCierre?: string | null;
  fechaRealCierre?: string | null;
  etapaId: number;
  contacto?: { nombre: string; apellido: string } | null;
  empresa?: { razonSocial: string } | null;
  responsable?: { nombre: string; apellido: string } | null;
}

interface Columna {
  etapa: Etapa;
  oportunidades: Oportunidad[];
}

interface OportunidadDetalle extends Oportunidad {
  etapa: { nombre: string };
  producto?: { nombre: string } | null;
  observaciones?: string | null;
  historialEtapas: HistorialEtapaItem[];
}

export function EmbudoPage() {
  const [columnas, setColumnas] = useState<Columna[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<OportunidadDetalle | null>(null);
  const [perdida, setPerdida] = useState<{ oportunidadId: number; etapaNuevaId: number } | null>(null);
  const [motivo, setMotivo] = useState("");

  async function cargar() {
    const res = await api.get("/embudo");
    setColumnas(res.data);
  }

  useEffect(() => {
    cargar();
  }, []);

  const totalEtapas = columnas.length || 1;

  async function moverEtapa(oportunidadId: number, etapaNuevaId: number, motivoPerdida?: string) {
    setError(null);
    try {
      await api.post(`/oportunidades/${oportunidadId}/cambiar-etapa`, { etapaNuevaId, motivoPerdida });
      await cargar();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "No se pudo cambiar de etapa");
    }
  }

  function handleMover(oportunidadId: number, etapaNuevaId: number, etapaTipo: string) {
    if (etapaTipo === "PERDIDA") {
      setMotivo("");
      setPerdida({ oportunidadId, etapaNuevaId });
      return;
    }
    moverEtapa(oportunidadId, etapaNuevaId);
  }

  async function confirmarPerdida(e: FormEvent) {
    e.preventDefault();
    if (!perdida) return;
    await moverEtapa(perdida.oportunidadId, perdida.etapaNuevaId, motivo);
    setPerdida(null);
  }

  async function abrirDetalle(id: number) {
    const res = await api.get(`/oportunidades/${id}`);
    setDetalle(res.data);
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h2>Embudo comercial</h2>
          <p>Arrastrá el criterio: elegí la próxima etapa de cada consulta desde la tarjeta.</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="board">
        {columnas.map(({ etapa, oportunidades }) => {
          const progresoEtapa = Math.round((etapa.orden / totalEtapas) * 100);
          const cerradaClass = etapa.tipo === "GANADA" ? "is-won" : etapa.tipo === "PERDIDA" ? "is-lost" : "";
          return (
            <div className="board-column" key={etapa.id}>
              <div className="board-column-header">
                <span className={`board-column-dot ${cerradaClass}`} />
                <h3>{etapa.nombre}</h3>
                <span className="count">{oportunidades.length}</span>
              </div>
              <div className="board-column-body">
                {oportunidades.map((o) => {
                  const abierta = etapa.tipo === "ABIERTA";
                  const probabilidad =
                    etapa.tipo === "GANADA" ? 100 : etapa.tipo === "PERDIDA" ? o.probabilidadCierre ?? 0 : o.probabilidadCierre ?? progresoEtapa;
                  const fechaFoco = abierta ? o.fechaEstimadaCierre : o.fechaRealCierre;
                  const fechaLabel = fechaFoco
                    ? new Date(fechaFoco).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
                    : abierta
                      ? "Sin fecha estimada"
                      : "Sin fecha de cierre";
                  const fechaClass = !fechaFoco ? "is-unset" : cerradaClass;

                  return (
                    <div className="opp-card" key={o.id} onClick={() => abrirDetalle(o.id)}>
                      <div className="opp-card-head">
                        <div className="opp-card-heading">
                          <span className="opp-card-title">{o.titulo}</span>
                          <span className="opp-card-subtitle">
                            {o.contacto ? `${o.contacto.nombre} ${o.contacto.apellido}` : o.empresa?.razonSocial ?? "Sin relación"}
                          </span>
                        </div>
                        {abierta ? (
                          <select
                            className="opp-card-move"
                            defaultValue=""
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const [id, tipo] = e.target.value.split("|");
                              if (id) handleMover(o.id, Number(id), tipo);
                              e.target.value = "";
                            }}
                          >
                            <option value="">Mover a...</option>
                            {columnas
                              .filter((c) => c.etapa.id !== etapa.id)
                              .map((c) => (
                                <option key={c.etapa.id} value={`${c.etapa.id}|${c.etapa.tipo}`}>
                                  {c.etapa.nombre}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <Badge value={o.estado} />
                        )}
                      </div>

                      <div>
                        <div className="opp-card-progress-row">
                          <span>Probabilidad de cierre</span>
                          <strong>{probabilidad}%</strong>
                        </div>
                        <div className={`opp-card-progress ${cerradaClass}`}>
                          <span style={{ width: `${Math.max(probabilidad, 6)}%` }} />
                        </div>
                      </div>

                      <div className="opp-card-footer">
                        <span className={`opp-card-date ${fechaClass}`}>{fechaLabel}</span>
                        <div className="opp-card-value">
                          <Avatar nombre={o.responsable?.nombre} apellido={o.responsable?.apellido} size={24} />
                          {o.valorEstimado ? `$${o.valorEstimado}` : "—"}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {oportunidades.length === 0 && <div className="board-column-empty">Sin oportunidades</div>}
              </div>
            </div>
          );
        })}
      </div>

      {perdida && (
        <Modal title="Motivo de pérdida" onClose={() => setPerdida(null)} width={420}>
          <form onSubmit={confirmarPerdida}>
            <div className="form-grid">
              <label className="span-2">
                ¿Por qué se pierde esta oportunidad? *
                <textarea required value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={() => setPerdida(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn danger">
                Marcar como perdida
              </button>
            </div>
          </form>
        </Modal>
      )}

      {detalle && (
        <Modal title={detalle.titulo} onClose={() => setDetalle(null)}>
          <dl className="detail-grid">
            <div className="detail-item">
              <dt>Estado</dt>
              <dd>
                <Badge value={detalle.estado} />
              </dd>
            </div>
            <div className="detail-item">
              <dt>Etapa actual</dt>
              <dd>{detalle.etapa.nombre}</dd>
            </div>
            <div className="detail-item">
              <dt>Contacto / Empresa</dt>
              <dd>{detalle.contacto ? `${detalle.contacto.nombre} ${detalle.contacto.apellido}` : detalle.empresa?.razonSocial ?? "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>Responsable</dt>
              <dd>{detalle.responsable ? `${detalle.responsable.nombre} ${detalle.responsable.apellido}` : "Sin asignar"}</dd>
            </div>
            <div className="detail-item">
              <dt>Plan / servicio</dt>
              <dd>{detalle.producto?.nombre ?? "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>Valor estimado</dt>
              <dd>{detalle.valorEstimado ? `$${detalle.valorEstimado}` : "—"}</dd>
            </div>
          </dl>
          {detalle.observaciones && (
            <div className="detail-section">
              <h4>Observaciones</h4>
              <p>{detalle.observaciones}</p>
            </div>
          )}
          <div className="detail-section">
            <h4>Historial de etapas ({detalle.historialEtapas.length})</h4>
            <HistorialEtapas items={detalle.historialEtapas} />
          </div>
        </Modal>
      )}
    </div>
  );
}
