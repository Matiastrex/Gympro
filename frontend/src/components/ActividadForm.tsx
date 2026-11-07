import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { Modal } from "./Modal";
import { TipoActividadIcon } from "./TipoActividadIcon";
import {
  Actividad,
  RefEntidad,
  TipoActividad,
  TipoEntidad,
  mensajeDeError,
  refDe,
} from "../types/actividades";

interface Opcion {
  id: number;
  etiqueta: string;
}

interface ActividadFormProps {
  /** Fija la entidad cuando se abre desde un detalle; sin ella se elige en el formulario. */
  entidad?: RefEntidad;
  /** Cómo se llama la entidad fija, para mostrarlo arriba del formulario. */
  nombreEntidad?: string;
  onClose: () => void;
  onRegistrada: (actividad: Actividad) => void;
}

// Lo mínimo que se lee del listado de cada entidad para armar el select.
interface FilaPorEntidad {
  contacto: { id: number; nombre: string; apellido: string };
  empresa: { id: number; razonSocial: string };
  oportunidad: { id: number; titulo: string };
}

interface ConfigEntidad<T extends TipoEntidad> {
  label: string;
  endpoint: string;
  etiqueta: (fila: FilaPorEntidad[T]) => string;
}

const ENTIDADES: { [T in TipoEntidad]: ConfigEntidad<T> } = {
  contacto: { label: "Contacto", endpoint: "/contactos", etiqueta: (c) => `${c.nombre} ${c.apellido}` },
  empresa: { label: "Convenio (empresa)", endpoint: "/empresas", etiqueta: (e) => e.razonSocial },
  oportunidad: { label: "Oportunidad", endpoint: "/oportunidades", etiqueta: (o) => o.titulo },
};

const TIPOS_ENTIDAD = Object.keys(ENTIDADES) as TipoEntidad[];

async function cargarOpciones<T extends TipoEntidad>(tipo: T): Promise<Opcion[]> {
  const config: ConfigEntidad<T> = ENTIDADES[tipo];
  const res = await api.get<FilaPorEntidad[T][]>(config.endpoint);
  return res.data.map((fila) => ({ id: fila.id, etiqueta: config.etiqueta(fila) }));
}

// "YYYY-MM-DDTHH:mm" en hora local, el formato de <input type="datetime-local">.
function ahoraLocal() {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ActividadForm({ entidad, nombreEntidad, onClose, onRegistrada }: ActividadFormProps) {
  const [tipos, setTipos] = useState<TipoActividad[]>([]);
  const [tipoActividadId, setTipoActividadId] = useState("");
  const [fecha, setFecha] = useState(ahoraLocal);
  const [descripcion, setDescripcion] = useState("");
  const [resultado, setResultado] = useState("");
  const [tipoEntidad, setTipoEntidad] = useState<TipoEntidad>("contacto");
  const [entidadId, setEntidadId] = useState("");
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const max = useMemo(ahoraLocal, []);

  useEffect(() => {
    api.get<TipoActividad[]>("/catalogos/tipos-actividad").then((res) => setTipos(res.data));
  }, []);

  useEffect(() => {
    if (entidad) return;
    setEntidadId("");
    cargarOpciones(tipoEntidad).then(setOpciones);
  }, [entidad, tipoEntidad]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const ref = entidad ?? (entidadId ? refDe(tipoEntidad, Number(entidadId)) : null);
    if (!ref) {
      setError("Elegí con quién fue la actividad");
      return;
    }
    setGuardando(true);
    try {
      const res = await api.post<Actividad>("/actividades", {
        ...ref,
        tipoActividadId: Number(tipoActividadId),
        fecha: new Date(fecha).toISOString(),
        descripcion,
        resultado: resultado || null,
      });
      onRegistrada(res.data);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo registrar la actividad"));
    } finally {
      setGuardando(false);
    }
  }

  const tipoElegido = tipos.find((t) => t.id === Number(tipoActividadId));

  return (
    <Modal title="Registrar actividad" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="error-box">{error}</div>}
        {nombreEntidad && (
          <p className="actividad-form-entidad">
            Con <strong>{nombreEntidad}</strong>
          </p>
        )}
        <div className="form-grid">
          {!entidad && (
            <>
              <label>
                Relacionada con
                <select value={tipoEntidad} onChange={(e) => setTipoEntidad(e.target.value as TipoEntidad)}>
                  {TIPOS_ENTIDAD.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {ENTIDADES[tipo].label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {ENTIDADES[tipoEntidad].label} *
                <select required value={entidadId} onChange={(e) => setEntidadId(e.target.value)}>
                  <option value="">Elegir…</option>
                  {opciones.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label>
            Tipo *
            <span className="select-con-icono">
              {tipoElegido && <TipoActividadIcon nombre={tipoElegido.nombre} width={16} height={16} />}
              <select required value={tipoActividadId} onChange={(e) => setTipoActividadId(e.target.value)}>
                <option value="">Elegir…</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label>
            Cuándo ocurrió *
            <input type="datetime-local" required max={max} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <label className="span-2">
            Qué pasó *
            <textarea
              required
              placeholder="Ej.: Llamó para preguntar por los horarios de funcional a la mañana."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </label>
          <label className="span-2">
            Resultado
            <input
              placeholder="Ej.: Quedó en venir a la clase de prueba del jueves"
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
            />
          </label>
        </div>
        <p className="actividad-form-nota">Las actividades no se editan una vez registradas: forman parte del historial.</p>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn" disabled={guardando}>
            {guardando ? "Registrando…" : "Registrar actividad"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
