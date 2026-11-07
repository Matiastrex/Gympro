import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Badge } from "../components/Badge";
import { BellIcon, ReabrirIcon } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import { EVENTO_NOTIFICACIONES } from "../components/Topbar";
import { assertNever, formatearFecha, mensajeDeError, nombreUsuario } from "../types/actividades";
import type { EstadoSolicitud, Notificacion, PaginaNotificaciones, SolicitudReapertura } from "../types/notificaciones";

type Vista = "no-leidas" | "todas";

const ESTADO_SOLICITUD: Record<EstadoSolicitud, { label: string; badge: string }> = {
  PENDIENTE: { label: "Pendiente", badge: "BAJA" }, // reutiliza el badge-warning
  APROBADA: { label: "Aprobada", badge: "GANADA" },
  RECHAZADA: { label: "Rechazada", badge: "PERDIDA" },
};

function titulo(n: Notificacion): string {
  switch (n.tipo) {
    case "REAPERTURA_SOLICITADA":
      return "Pedido de reapertura";
    case "REAPERTURA_APROBADA":
      return "Reapertura aprobada";
    case "REAPERTURA_RECHAZADA":
      return "Reapertura rechazada";
    default:
      return assertNever(n);
  }
}

const avisarCambio = () => window.dispatchEvent(new Event(EVENTO_NOTIFICACIONES));

export function NotificacionesPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "ADMINISTRADOR";
  const [vista, setVista] = useState<Vista>("no-leidas");
  const [datos, setDatos] = useState<PaginaNotificaciones | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [rechazando, setRechazando] = useState<SolicitudReapertura | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    api
      .get<PaginaNotificaciones>("/notificaciones", { params: { soloNoLeidas: vista === "no-leidas", pageSize: 50 } })
      .then((res) => vigente && setDatos(res.data));
    return () => {
      vigente = false;
    };
  }, [vista, recarga]);

  const recargar = () => {
    setRecarga((n) => n + 1);
    avisarCambio();
  };

  async function marcarLeida(n: Notificacion) {
    if (n.leida) return;
    await api.post(`/notificaciones/${n.id}/leer`);
    recargar();
  }

  async function marcarTodas() {
    await api.post("/notificaciones/leer-todas");
    recargar();
  }

  async function aprobar(n: Notificacion) {
    setError(null);
    try {
      await api.post(`/reaperturas/${n.solicitud.id}/aprobar`);
      await api.post(`/notificaciones/${n.id}/leer`);
      recargar();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo aprobar la reapertura"));
    }
  }

  const items = datos?.items ?? [];
  const hayNoLeidas = items.some((n) => !n.leida);

  return (
    <div className="container container-narrow">
      <div className="page-header">
        <div>
          <h2>Notificaciones</h2>
          <p>
            {esAdmin
              ? "Pedidos del equipo para reabrir oportunidades perdidas."
              : "Las respuestas a tus pedidos de reapertura."}
          </p>
        </div>
        <div className="toolbar">
          <div className="segmented" role="group" aria-label="Qué mostrar">
            <button type="button" aria-pressed={vista === "no-leidas"} onClick={() => setVista("no-leidas")}>
              Sin leer
            </button>
            <button type="button" aria-pressed={vista === "todas"} onClick={() => setVista("todas")}>
              Todas
            </button>
          </div>
          {hayNoLeidas && (
            <button type="button" className="link-btn" onClick={marcarTodas}>
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {datos && items.length === 0 && (
        <div className="card empty-inbox">
          <BellIcon width={28} height={28} aria-hidden="true" />
          <p>
            {vista === "no-leidas"
              ? "Estás al día: no hay notificaciones sin leer."
              : "Todavía no recibiste notificaciones."}
          </p>
        </div>
      )}

      <ul className="inbox">
        {items.map((n) => {
          const s = n.solicitud;
          const resolver = esAdmin && n.tipo === "REAPERTURA_SOLICITADA" && s.estado === "PENDIENTE";
          return (
            <li key={n.id} className={`card inbox-item${n.leida ? "" : " is-unread"}`}>
              <span className={`inbox-marker is-${n.tipo.toLowerCase().replace("reapertura_", "")}`} aria-hidden="true">
                <ReabrirIcon />
              </span>
              <div className="inbox-body">
                <div className="inbox-heading">
                  <strong>{titulo(n)}</strong>
                  <time dateTime={n.createdAt}>{formatearFecha(n.createdAt)}</time>
                </div>
                <p className="inbox-mensaje">{n.mensaje}</p>
                {n.tipo === "REAPERTURA_SOLICITADA" && <blockquote className="inbox-motivo">{s.motivo}</blockquote>}
                <div className="inbox-footer">
                  <Badge value={ESTADO_SOLICITUD[s.estado].badge}>{ESTADO_SOLICITUD[s.estado].label}</Badge>
                  {s.resueltaPor && s.estado !== "PENDIENTE" && (
                    <span className="cell-muted">
                      por {nombreUsuario(s.resueltaPor)}
                      {s.comentarioResolucion && `: ${s.comentarioResolucion}`}
                    </span>
                  )}
                  <span className="inbox-actions">
                    {resolver && (
                      <>
                        <button type="button" className="btn secondary btn-sm" onClick={() => setRechazando(s)}>
                          Rechazar
                        </button>
                        <button type="button" className="btn btn-sm" onClick={() => aprobar(n)}>
                          Aprobar y reabrir
                        </button>
                      </>
                    )}
                    {!n.leida && !resolver && (
                      <button type="button" className="link-btn" onClick={() => marcarLeida(n)}>
                        Marcar como leída
                      </button>
                    )}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {rechazando && (
        <RechazoModal
          solicitud={rechazando}
          onClose={() => setRechazando(null)}
          onRechazada={async () => {
            const notif = items.find((n) => n.solicitud.id === rechazando.id);
            if (notif && !notif.leida) await api.post(`/notificaciones/${notif.id}/leer`);
            setRechazando(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}

function RechazoModal({
  solicitud,
  onClose,
  onRechazada,
}: {
  solicitud: SolicitudReapertura;
  onClose: () => void;
  onRechazada: () => void;
}) {
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/reaperturas/${solicitud.id}/rechazar`, { comentario });
      onRechazada();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo rechazar el pedido"));
    }
  }

  return (
    <Modal title="Rechazar reapertura" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="error-box">{error}</div>}
        <p className="actividad-form-entidad">
          {nombreUsuario(solicitud.solicitante)} va a recibir este comentario junto con el rechazo.
        </p>
        <div className="form-grid">
          <label className="span-2">
            Por qué se rechaza *
            <textarea required value={comentario} onChange={(e) => setComentario(e.target.value)} />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn danger">
            Rechazar pedido
          </button>
        </div>
      </form>
    </Modal>
  );
}
