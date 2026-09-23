export interface HistorialEtapaItem {
  id: number;
  fecha: string;
  observacion?: string | null;
  etapaAnterior?: { nombre: string } | null;
  etapaNueva: { nombre: string };
  usuario: { nombre: string; apellido: string };
}

interface HistorialEtapasProps {
  items: HistorialEtapaItem[];
}

export function HistorialEtapas({ items }: HistorialEtapasProps) {
  return (
    <div className="stage-history">
      {items.map((item) => (
        <article className="stage-history-item" key={item.id}>
          <span className="stage-history-marker" aria-hidden="true" />
          <div className="stage-history-content">
            <div className="stage-history-heading">
              <strong>
                {item.etapaAnterior
                  ? `${item.etapaAnterior.nombre} → ${item.etapaNueva.nombre}`
                  : `Creada en ${item.etapaNueva.nombre}`}
              </strong>
              <time dateTime={item.fecha}>
                {new Date(item.fecha).toLocaleString("es-AR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
            </div>
            <span className="stage-history-user">
              Por {item.usuario.nombre} {item.usuario.apellido}
            </span>
            {item.observacion && <p>{item.observacion}</p>}
          </div>
        </article>
      ))}
      {items.length === 0 && <p className="cell-muted">Sin movimientos de etapa registrados</p>}
    </div>
  );
}