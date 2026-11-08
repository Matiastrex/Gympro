import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Paginacion } from "../components/Paginacion";
import { ActividadForm } from "../components/ActividadForm";
import { TipoActividadIcon } from "../components/TipoActividadIcon";
import { SearchIcon } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import { veTodo } from "../constants/roles";
import { Actividad, Paginado, TipoActividad, formatearFecha, nombreUsuario } from "../types/actividades";

const PAGE_SIZE = 15;

interface Filtros {
  q: string;
  tipoActividadId: string;
  usuarioId: string;
  desde: string; // YYYY-MM-DD
  hasta: string;
}

const filtrosVacios: Filtros = { q: "", tipoActividadId: "", usuarioId: "", desde: "", hasta: "" };

type UsuarioOpcion = { id: number; nombre: string; apellido: string };

// Las fechas del filtro son días locales: desde el inicio de uno hasta el final del otro.
function inicioDelDia(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toISOString();
}
function finDelDia(fecha: string) {
  return new Date(`${fecha}T23:59:59.999`).toISOString();
}

function aParams(filtros: Filtros, page: number) {
  return {
    page,
    pageSize: PAGE_SIZE,
    q: filtros.q.trim() || undefined,
    tipoActividadId: filtros.tipoActividadId || undefined,
    usuarioId: filtros.usuarioId || undefined,
    desde: filtros.desde ? inicioDelDia(filtros.desde) : undefined,
    hasta: filtros.hasta ? finDelDia(filtros.hasta) : undefined,
  };
}

function relacionDe(a: Actividad) {
  const persona = a.contacto ? `${a.contacto.nombre} ${a.contacto.apellido}` : null;
  const principal = persona ?? a.empresa?.razonSocial ?? a.oportunidad?.titulo ?? "—";
  const secundaria = [persona && a.empresa?.razonSocial, a.oportunidad && principal !== a.oportunidad.titulo ? a.oportunidad.titulo : null]
    .filter(Boolean)
    .join(" · ");
  return { principal, secundaria };
}

export function ActividadesPage() {
  const { usuario } = useAuth();
  const verEquipo = veTodo(usuario?.rol);
  const [filtros, setFiltros] = useState<Filtros>(filtrosVacios);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [datos, setDatos] = useState<Paginado<Actividad> | null>(null);
  const [tipos, setTipos] = useState<TipoActividad[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOpcion[]>([]);
  const [registrando, setRegistrando] = useState(false);
  const [detalle, setDetalle] = useState<Actividad | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    api.get<TipoActividad[]>("/catalogos/tipos-actividad").then((res) => setTipos(res.data));
    if (verEquipo) api.get<UsuarioOpcion[]>("/usuarios").then((res) => setUsuarios(res.data));
  }, [verEquipo]);

  // La búsqueda por texto espera a que se deje de tipear.
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((f) => (f.q === busqueda ? f : { ...f, q: busqueda }));
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    // Si cambian los filtros antes de que llegue la respuesta, se descarta la vieja.
    let vigente = true;
    api
      .get<Paginado<Actividad>>("/actividades", { params: aParams(filtros, page) })
      .then((res) => {
        if (!vigente) return;
        setDatos(res.data);
        setError(null);
      })
      .catch(() => vigente && setError("No se pudieron cargar las actividades"));
    return () => {
      vigente = false;
    };
  }, [filtros, page, recarga]);

  function cambiar<K extends keyof Filtros>(clave: K, valor: Filtros[K]) {
    setFiltros((f) => ({ ...f, [clave]: valor }));
    setPage(1);
  }

  const hayFiltros = busqueda !== "" || Object.entries(filtros).some(([k, v]) => k !== "q" && v !== "");
  const total = datos?.total ?? 0;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h2>Actividades</h2>
          <p>
            {verEquipo
              ? "Llamadas, mensajes y visitas de todo el equipo con socios y convenios."
              : "Lo que registraste vos y lo que pasó con tus socios y convenios."}
          </p>
        </div>
        <div className="toolbar">
          <div className="search-input">
            <SearchIcon />
            <input
              placeholder="Buscar en descripción o resultado"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar actividades"
            />
          </div>
          <button className="btn" onClick={() => setRegistrando(true)}>
            + Registrar actividad
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <select
          className="filter-select"
          value={filtros.tipoActividadId}
          onChange={(e) => cambiar("tipoActividadId", e.target.value)}
          aria-label="Tipo de actividad"
        >
          <option value="">Todos los tipos</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
        {verEquipo && (
          <select
            className="filter-select"
            value={filtros.usuarioId}
            onChange={(e) => cambiar("usuarioId", e.target.value)}
            aria-label="Registrada por"
          >
            <option value="">Todo el equipo</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {nombreUsuario(u)}
              </option>
            ))}
          </select>
        )}
        <label>
          Desde
          <input type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => cambiar("desde", e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => cambiar("hasta", e.target.value)} />
        </label>
        {hayFiltros && (
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setBusqueda("");
              setFiltros(filtrosVacios);
              setPage(1);
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Con quién</th>
              <th>Qué pasó</th>
              <th>Resultado</th>
              <th>Registró</th>
            </tr>
          </thead>
          <tbody>
            {datos?.items.map((a) => {
              const relacion = relacionDe(a);
              return (
                <tr key={a.id} onClick={() => setDetalle(a)}>
                  <td className="cell-fecha">{formatearFecha(a.fecha)}</td>
                  <td>
                    <span className="cell-tipo">
                      <TipoActividadIcon nombre={a.tipoActividad.nombre} width={16} height={16} />
                      {a.tipoActividad.nombre}
                    </span>
                  </td>
                  <td>
                    <div className="cell-relacion">
                      <span className="cell-primary">{relacion.principal}</span>
                      {relacion.secundaria && <small>{relacion.secundaria}</small>}
                    </div>
                  </td>
                  <td className="cell-descripcion">
                    <p>{a.descripcion}</p>
                  </td>
                  <td className="cell-muted cell-resultado">{a.resultado || "—"}</td>
                  <td className="cell-muted cell-fecha">{nombreUsuario(a.usuario)}</td>
                </tr>
              );
            })}
            {datos && datos.items.length === 0 && (
              <tr className="row-empty">
                <td colSpan={6} className="empty-state">
                  {hayFiltros
                    ? "Ninguna actividad coincide con estos filtros."
                    : "Todavía no hay actividades. Registrá la primera llamada, mensaje o visita."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Paginacion total={total} page={page} pageSize={PAGE_SIZE} onPage={setPage} />
      </div>

      {registrando && (
        <ActividadForm
          onClose={() => setRegistrando(false)}
          onRegistrada={() => {
            setRegistrando(false);
            setPage(1);
            setRecarga((n) => n + 1);
          }}
        />
      )}

      {detalle && (
        <Modal title={detalle.tipoActividad.nombre} onClose={() => setDetalle(null)}>
          <dl className="detail-grid">
            <div className="detail-item">
              <dt>Cuándo</dt>
              <dd>{formatearFecha(detalle.fecha)}</dd>
            </div>
            <div className="detail-item">
              <dt>Registró</dt>
              <dd>{nombreUsuario(detalle.usuario)}</dd>
            </div>
            {detalle.contacto && (
              <div className="detail-item">
                <dt>Contacto</dt>
                <dd>
                  {detalle.contacto.nombre} {detalle.contacto.apellido}
                </dd>
              </div>
            )}
            {detalle.empresa && (
              <div className="detail-item">
                <dt>Convenio</dt>
                <dd>{detalle.empresa.razonSocial}</dd>
              </div>
            )}
            {detalle.oportunidad && (
              <div className="detail-item">
                <dt>Oportunidad</dt>
                <dd>{detalle.oportunidad.titulo}</dd>
              </div>
            )}
          </dl>
          <div className="detail-section">
            <h4>Qué pasó</h4>
            <p className="timeline-descripcion">{detalle.descripcion}</p>
            {detalle.resultado && (
              <p className="timeline-resultado">
                <span>Resultado</span> {detalle.resultado}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
