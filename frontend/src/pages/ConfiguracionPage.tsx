import { NavLink, Navigate, useParams } from "react-router-dom";
import { CatalogoEditor } from "../components/config/CatalogoEditor";
import { EtapasEditor } from "../components/config/EtapasEditor";
import { ProductosEditor } from "../components/config/ProductosEditor";
import { assertNever } from "../types/actividades";
import { SECCIONES, esSeccion, type Seccion } from "../types/configuracion";

const SECCION: Record<Seccion, { titulo: string; uso: string }> = {
  etapas: {
    titulo: "Etapas del embudo",
    uso: "Los pasos por los que pasa una consulta hasta que el socio se inscribe o se pierde.",
  },
  productos: {
    titulo: "Planes de membresía",
    uso: "Lo que se le ofrece al socio en cada oportunidad.",
  },
  "tipos-actividad": {
    titulo: "Tipos de actividad",
    uso: "Aparecen al registrar una llamada, un mensaje o una visita.",
  },
  origenes: {
    titulo: "Orígenes",
    uso: "Por dónde llegó el socio, el convenio o la consulta.",
  },
  "motivos-perdida": {
    titulo: "Motivos de pérdida",
    uso: "Se eligen al marcar una oportunidad como perdida y alimentan el gráfico del dashboard.",
  },
};

const PESTANA: Record<Seccion, string> = {
  etapas: "Etapas",
  productos: "Planes",
  "tipos-actividad": "Tipos de actividad",
  origenes: "Orígenes",
  "motivos-perdida": "Motivos de pérdida",
};

function Editor({ seccion }: { seccion: Seccion }) {
  switch (seccion) {
    case "etapas":
      return <EtapasEditor />;
    case "productos":
      return <ProductosEditor />;
    case "tipos-actividad":
      return <CatalogoEditor catalogo="tipos-actividad" singular="tipo de actividad" placeholder="Nuevo tipo, ej.: Evaluación física" />;
    case "origenes":
      return <CatalogoEditor catalogo="origenes" singular="origen" placeholder="Nuevo origen, ej.: TikTok" />;
    case "motivos-perdida":
      return <CatalogoEditor catalogo="motivos-perdida" singular="motivo" placeholder="Nuevo motivo, ej.: Lesión" />;
    default:
      return assertNever(seccion);
  }
}

export function ConfiguracionPage() {
  const { seccion } = useParams();
  if (!esSeccion(seccion)) return <Navigate to="/configuracion/etapas" replace />;
  const { titulo, uso } = SECCION[seccion];

  return (
    <div className="container container-config">
      <div className="page-header">
        <div>
          <h2>Configuración</h2>
          <p>Cómo trabaja el gimnasio: el embudo, los planes y las listas de los formularios.</p>
        </div>
      </div>

      <nav className="config-tabs" aria-label="Secciones de configuración">
        {SECCIONES.map((s) => (
          <NavLink key={s} to={`/configuracion/${s}`} className={({ isActive }) => (isActive ? "is-active" : undefined)}>
            {PESTANA[s]}
          </NavLink>
        ))}
      </nav>

      <section className="card config-panel" aria-labelledby="config-titulo">
        <header className="config-panel-header">
          <h3 id="config-titulo">{titulo}</h3>
          <p>{uso}</p>
        </header>
        <Editor key={seccion} seccion={seccion} />
      </section>
    </div>
  );
}
