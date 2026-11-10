import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { ActividadForm } from "./ActividadForm";
import { TipoActividadIcon } from "./TipoActividadIcon";
import { Badge } from "./Badge";
import { FunnelIcon, PencilIcon } from "./icons";
import {
  Actividad,
  CambioEtapa,
  EdicionOportunidad,
  HistorialItem,
  KindHistorial,
  RefEntidad,
  assertNever,
  entidadDe,
  formatearFecha,
  nombreUsuario,
} from "../types/actividades";

interface HistorialComercialProps {
  entidad: RefEntidad;
  /** Nombre de la entidad, para el encabezado del formulario de alta. */
  nombreEntidad: string;
  /** Si viene, no se pueden registrar actividades y se explica por qué. */
  motivoSoloLectura?: string | null;
}

type Filtro = "todo" | KindHistorial;

const FILTROS: readonly { valor: Filtro; label: string }[] = [
  { valor: "todo", label: "Todo" },
  { valor: "actividad", label: "Actividades" },
  { valor: "etapa", label: "Etapas" },
  { valor: "edicion", label: "Correcciones" },
];

const ETAPA_CIERRE = new Set(["GANADA", "PERDIDA", "BAJA"]);

export function HistorialComercial({ entidad, nombreEntidad, motivoSoloLectura }: HistorialComercialProps) {
  const [items, setItems] = useState<HistorialItem[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [registrando, setRegistrando] = useState(false);
  const { tipo, id } = entidadDe(entidad);

  const cargar = useCallback(async () => {
    const res = await api.get<HistorialItem[]>("/actividades/historial", { params: { [`${tipo}Id`]: id } });
    setItems(res.data);
  }, [tipo, id]);

  useEffect(() => {
    setItems(null);
    cargar();
  }, [cargar]);

  const visibles = (items ?? []).filter((item) => filtro === "todo" || item.kind === filtro);
  const cantidad = (kind: KindHistorial) => (items ?? []).filter((i) => i.kind === kind).length;

  return (
    <section className="detail-section historial-comercial">
      <div className="historial-header">
        <h4>Historial comercial</h4>
        <button
          type="button"
          className="btn secondary btn-sm"
          onClick={() => setRegistrando(true)}
          disabled={Boolean(motivoSoloLectura)}
          title={motivoSoloLectura ?? undefined}
        >
          + Registrar actividad
        </button>
      </div>

      {items && items.length > 0 && (
        <div className="segmented" role="group" aria-label="Qué mostrar">
          {/* "Correcciones" solo aparece si hubo alguna: es la excepción, no la regla. */}
          {FILTROS.filter((f) => f.valor !== "edicion" || cantidad("edicion") > 0).map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={filtro === f.valor}
              onClick={() => setFiltro(f.valor)}
            >
              {f.label}
              <span className="segmented-count">{f.valor === "todo" ? items.length : cantidad(f.valor)}</span>
            </button>
          ))}
        </div>
      )}

      {items === null ? (
        <p className="cell-muted">Cargando historial…</p>
      ) : visibles.length === 0 ? (
        <p className="historial-vacio">
          {items.length === 0
            ? "Todavía no hay nada registrado. Anotá la primera llamada, mensaje o visita para que el equipo sepa en qué quedó."
            : "No hay ítems de este tipo."}
        </p>
      ) : (
        <ol className="timeline">
          {visibles.map((item) => (
            <ItemHistorial key={`${item.kind}-${claveDe(item)}`} item={item} viendo={tipo} />
          ))}
        </ol>
      )}

      {registrando && (
        <ActividadForm
          entidad={entidad}
          nombreEntidad={nombreEntidad}
          onClose={() => setRegistrando(false)}
          onRegistrada={() => {
            setRegistrando(false);
            setFiltro("todo");
            cargar();
          }}
        />
      )}
    </section>
  );
}

function claveDe(item: HistorialItem): number {
  switch (item.kind) {
    case "actividad":
      return item.actividad.id;
    case "etapa":
      return item.cambio.id;
    case "edicion":
      return item.edicion.id;
    default:
      return assertNever(item);
  }
}

// `viendo` es la entidad dueña del historial: no se repite en cada ítem, pero
// sí se aclara de qué oportunidad (o de qué empleado del convenio) es cada uno.
type Viendo = ReturnType<typeof entidadDe>["tipo"];

function ItemHistorial({ item, viendo }: { item: HistorialItem; viendo: Viendo }) {
  switch (item.kind) {
    case "actividad":
      return <ItemActividad actividad={item.actividad} viendo={viendo} />;
    case "etapa":
      return <ItemEtapa cambio={item.cambio} mostrarOportunidad={viendo !== "oportunidad"} />;
    case "edicion":
      return <ItemEdicion edicion={item.edicion} mostrarOportunidad={viendo !== "oportunidad"} />;
    default:
      return assertNever(item);
  }
}

function ItemActividad({ actividad, viendo }: { actividad: Actividad; viendo: Viendo }) {
  const { contacto, oportunidad } = actividad;
  return (
    <li className="timeline-item is-actividad">
      <span className="timeline-marker">
        <TipoActividadIcon nombre={actividad.tipoActividad.nombre} width={15} height={15} />
      </span>
      <div className="timeline-content">
        <div className="timeline-heading">
          <strong>{actividad.tipoActividad.nombre}</strong>
          <time dateTime={actividad.fecha}>{formatearFecha(actividad.fecha)}</time>
        </div>
        <p className="timeline-descripcion">{actividad.descripcion}</p>
        {actividad.resultado && (
          <p className="timeline-resultado">
            <span>Resultado</span> {actividad.resultado}
          </p>
        )}
        <span className="timeline-meta">
          {nombreUsuario(actividad.usuario)}
          {viendo === "empresa" && contacto && <> con {contacto.nombre} {contacto.apellido}</>}
          {viendo !== "oportunidad" && oportunidad && <> en «{oportunidad.titulo}»</>}
        </span>
      </div>
    </li>
  );
}

function ItemEtapa({ cambio, mostrarOportunidad }: { cambio: CambioEtapa; mostrarOportunidad: boolean }) {
  const cierre = ETAPA_CIERRE.has(cambio.etapaNueva.tipo);
  return (
    <li className="timeline-item is-etapa">
      <span className="timeline-marker">
        <FunnelIcon width={13} height={13} aria-hidden="true" />
      </span>
      <div className="timeline-content">
        <div className="timeline-heading">
          <span className="timeline-etapas">
            {cambio.etapaAnterior ? (
              <>
                {cambio.etapaAnterior.nombre} <span aria-label="pasó a">→</span>{" "}
              </>
            ) : (
              "Ingresó en "
            )}
            {cierre ? (
              <Badge value={cambio.etapaNueva.tipo}>{cambio.etapaNueva.nombre}</Badge>
            ) : (
              <strong>{cambio.etapaNueva.nombre}</strong>
            )}
          </span>
          <time dateTime={cambio.fecha}>{formatearFecha(cambio.fecha)}</time>
        </div>
        {cambio.observacion && <p className="timeline-descripcion">{cambio.observacion}</p>}
        <span className="timeline-meta">
          {nombreUsuario(cambio.usuario)}
          {mostrarOportunidad && <> en «{cambio.oportunidad.titulo}»</>}
        </span>
      </div>
    </li>
  );
}

function ItemEdicion({ edicion, mostrarOportunidad }: { edicion: EdicionOportunidad; mostrarOportunidad: boolean }) {
  return (
    <li className="timeline-item is-edicion">
      <span className="timeline-marker">
        <PencilIcon width={13} height={13} aria-hidden="true" />
      </span>
      <div className="timeline-content">
        <div className="timeline-heading">
          <strong>Corrección de oportunidad cerrada</strong>
          <time dateTime={edicion.fecha}>{formatearFecha(edicion.fecha)}</time>
        </div>
        <ul className="timeline-cambios">
          {edicion.cambios.map((c) => (
            <li key={c.campo}>
              <span className="timeline-cambio-campo">{c.campo}:</span> <del>{c.antes ?? "—"}</del>{" "}
              <span aria-label="pasó a">→</span> <ins>{c.despues ?? "—"}</ins>
            </li>
          ))}
        </ul>
        <p className="timeline-resultado">
          <span>Motivo</span> {edicion.motivo}
        </p>
        <span className="timeline-meta">
          {nombreUsuario(edicion.usuario)}
          {mostrarOportunidad && <> en «{edicion.oportunidad.titulo}»</>}
        </span>
      </div>
    </li>
  );
}
