import { FormEvent, useState } from "react";
import { Modal } from "./Modal";

interface BajaModalProps {
  nombre: string;
  // Es cliente inscripto: la baja pasa su oportunidad a Inscripción cancelada.
  cancelaInscripcion: boolean;
  onClose: () => void;
  onConfirm: (contactarNuevamente: boolean, motivoBaja?: string) => Promise<void>;
}

// Baja lógica de un contacto o empresa: se elige si queda INACTIVO (se puede
// volver a contactar) o NO_CONTACTAR.
export function BajaModal({ nombre, cancelaInscripcion, onClose, onConfirm }: BajaModalProps) {
  const [contactarNuevamente, setContactarNuevamente] = useState<boolean | null>(null);
  const [motivoBaja, setMotivoBaja] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (contactarNuevamente === null) return;
    setError(null);
    setEnviando(true);
    try {
      await onConfirm(contactarNuevamente, motivoBaja || undefined);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "No se pudo dar de baja");
      setEnviando(false);
    }
  }

  return (
    <Modal title={`Dar de baja a ${nombre}`} onClose={onClose} width={440}>
      <form onSubmit={handleSubmit}>
        {error && <div className="error-box">{error}</div>}
        {cancelaInscripcion && (
          <div className="baja-aviso">
            Es cliente inscripto: su oportunidad pasará a la etapa <strong>Inscripción cancelada</strong>.
          </div>
        )}
        <p className="baja-pregunta">¿Se puede volver a contactar?</p>
        <div className="baja-opciones">
          <label className="baja-opcion">
            <input
              type="radio"
              name="contactarNuevamente"
              checked={contactarNuevamente === true}
              onChange={() => setContactarNuevamente(true)}
            />
            <span>
              <strong>Sí</strong>
              <small>Pasa a estado Inactivo.</small>
            </span>
          </label>
          <label className="baja-opcion">
            <input
              type="radio"
              name="contactarNuevamente"
              checked={contactarNuevamente === false}
              onChange={() => setContactarNuevamente(false)}
            />
            <span>
              <strong>No</strong>
              <small>Pasa a estado No contactar.</small>
            </span>
          </label>
        </div>
        {cancelaInscripcion && (
          <div className="form-grid baja-motivo">
            <label className="span-2">
              Motivo de la cancelación (opcional)
              <textarea value={motivoBaja} onChange={(e) => setMotivoBaja(e.target.value)} />
            </label>
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn danger" disabled={contactarNuevamente === null || enviando}>
            Dar de baja
          </button>
        </div>
      </form>
    </Modal>
  );
}
