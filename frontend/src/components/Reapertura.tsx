import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "./Modal";
import { ReabrirIcon } from "./icons";
import { useAuth } from "../context/AuthContext";
import { mensajeDeError } from "../types/actividades";

interface EtapaOpcion {
  id: number;
  nombre: string;
  tipo: string;
}

interface CambioHistorial {
  etapaAnterior: { id: number } | null;
  etapaNueva: { tipo: string };
}

export interface ReaperturaPendiente {
  id: number;
  createdAt: string;
  etapaDestino: { nombre: string };
  solicitante: { nombre: string; apellido: string };
}

interface ReaperturaProps {
  oportunidad: {
    id: number;
    titulo: string;
    estado: string;
    solicitudesReapertura?: ReaperturaPendiente[];
  };
  /** Después de pedir (o de reabrir, si es admin): recargar detalle y listados. */
  onCambio: () => void;
}

/**
 * Bloque del detalle de una oportunidad perdida: pedir reapertura (vendedor /
 * responsable comercial, la aprueba un admin) o reabrir directo (admin).
 */
export function Reapertura({ oportunidad, onCambio }: ReaperturaProps) {
  const { usuario } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  if (oportunidad.estado !== "PERDIDA") return null;

  const esAdmin = usuario?.rol === "ADMINISTRADOR";
  const pendiente = oportunidad.solicitudesReapertura?.[0];

  return (
    <section className="reapertura-callout" aria-live="polite">
      {pendiente ? (
        <p>
          <strong>Reapertura pendiente de aprobación.</strong> {pendiente.solicitante.nombre}{" "}
          {pendiente.solicitante.apellido} pidió que vuelva a {pendiente.etapaDestino.nombre}
          {esAdmin && " — resolvela desde Notificaciones"}.
        </p>
      ) : (
        <>
          <p>
            {aviso ??
              (esAdmin
                ? "Está perdida. Como administrador podés reabrirla en una etapa abierta."
                : "Está perdida. Si el socio volvió a interesarse, pedí que la reabran: lo aprueba un administrador.")}
          </p>
          <button type="button" className="btn secondary btn-sm" onClick={() => setAbierto(true)}>
            <ReabrirIcon /> {esAdmin ? "Reabrir" : "Pedir reapertura"}
          </button>
        </>
      )}
      {abierto && (
        <ReaperturaModal
          oportunidad={oportunidad}
          esAdmin={esAdmin}
          onClose={() => setAbierto(false)}
          onEnviada={(reabierta) => {
            setAbierto(false);
            setAviso(reabierta ? null : "Pedido enviado. Te avisamos en Notificaciones cuando se resuelva.");
            onCambio();
          }}
        />
      )}
    </section>
  );
}

/**
 * Formulario del pedido (o de la reapertura directa, si es admin). Se usa desde
 * el detalle y desde el embudo, cuando se arrastra una perdida a una etapa abierta.
 */
export function ReaperturaModal({
  oportunidad,
  esAdmin,
  etapaInicialId,
  onClose,
  onEnviada,
}: {
  oportunidad: { id: number; titulo: string };
  esAdmin: boolean;
  /** Etapa ya elegida (la columna donde se soltó la tarjeta); si no, la previa a perderse. */
  etapaInicialId?: number;
  onClose: () => void;
  onEnviada: (reabierta: boolean) => void;
}) {
  const [etapas, setEtapas] = useState<EtapaOpcion[]>([]);
  const [etapaDestinoId, setEtapaDestinoId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<EtapaOpcion[]>("/etapas"),
      api.get<CambioHistorial[]>(`/oportunidades/${oportunidad.id}/historial`),
    ]).then(([resEtapas, resHistorial]) => {
      const abiertas = resEtapas.data.filter((e) => e.tipo === "ABIERTA");
      setEtapas(abiertas);
      // Por defecto, la etapa en la que estaba justo antes de perderse.
      const ultimaPerdida = resHistorial.data.find((h) => h.etapaNueva.tipo === "PERDIDA");
      const elegida =
        abiertas.find((e) => e.id === etapaInicialId) ??
        abiertas.find((e) => e.id === ultimaPerdida?.etapaAnterior?.id) ??
        abiertas[0];
      if (elegida) setEtapaDestinoId(String(elegida.id));
    });
  }, [oportunidad.id, etapaInicialId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await api.post<{ reabierta: boolean }>(`/oportunidades/${oportunidad.id}/reapertura`, {
        etapaDestinoId: Number(etapaDestinoId),
        motivo,
      });
      onEnviada(res.data.reabierta);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo enviar el pedido"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={esAdmin ? "Reabrir oportunidad" : "Pedir reapertura"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="error-box">{error}</div>}
        <p className="actividad-form-entidad">
          «{oportunidad.titulo}» está perdida.{" "}
          {esAdmin
            ? "Vuelve a la etapa que elijas y queda registrado en el historial."
            : "Un administrador va a revisar el pedido antes de reabrirla."}
        </p>
        <div className="form-grid">
          <label className="span-2">
            Vuelve a la etapa *
            <select required value={etapaDestinoId} onChange={(e) => setEtapaDestinoId(e.target.value)}>
              {etapas.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="span-2">
            Por qué reabrirla *
            <textarea
              required
              placeholder="Ej.: Volvió a escribir y ahora tiene descuento por su obra social."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn" disabled={enviando || !etapaDestinoId}>
            {esAdmin ? "Reabrir" : enviando ? "Enviando…" : "Enviar pedido"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
