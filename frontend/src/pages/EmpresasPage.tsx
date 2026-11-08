import { FormEvent, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Badge, ESTADO_LABEL } from "../components/Badge";
import { Paginacion } from "../components/Paginacion";
import { useListadoPaginado } from "../hooks/useListadoPaginado";
import { useEquipo } from "../hooks/useEquipo";
import { Avatar } from "../components/Avatar";
import { ResponsableSelect } from "../components/ResponsableSelect";
import { CatalogoSelect, useCatalogo } from "../components/CatalogoSelect";
import type { RefCatalogo } from "../types/configuracion";
import { useAuth } from "../context/AuthContext";
import { veTodo } from "../constants/roles";
import { BajaModal } from "../components/BajaModal";
import { HistorialComercial } from "../components/HistorialComercial";
import { BajaIcon, PencilIcon, SearchIcon } from "../components/icons";

interface Empresa {
  id: number;
  razonSocial: string;
  cuit?: string | null;
  industria?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  sitioWeb?: string | null;
  estado: string;
  oportunidadAbiertaId?: number | null;
  origenId?: number | null;
  origen?: RefCatalogo | null;
  observaciones?: string | null;
  responsableId?: number | null;
  responsable?: { id: number; nombre: string; apellido: string } | null;
}

interface EmpresaDetalle extends Empresa {
  contactos: { id: number; nombre: string; apellido: string }[];
  oportunidades: { id: number; titulo: string; etapa: { nombre: string } }[];
}

const ESTADOS = ["POTENCIAL", "CLIENTE", "INACTIVO", "NO_CONTACTAR"];

const filtrosVacios = { estado: "", responsableId: "", origenId: "" };

const formVacio = {
  razonSocial: "",
  cuit: "",
  industria: "",
  email: "",
  telefono: "",
  direccion: "",
  sitioWeb: "",
  estado: "POTENCIAL",
  origenId: "",
  observaciones: "",
  responsableId: "",
};

export function EmpresasPage() {
  const { usuario } = useAuth();
  const verEquipo = veTodo(usuario?.rol);
  const listado = useListadoPaginado<Empresa, typeof filtrosVacios>("/empresas", filtrosVacios);
  const { filtros, cambiar } = listado;
  const equipo = useEquipo(verEquipo);
  const origenes = useCatalogo("origenes");
  const [form, setForm] = useState(formVacio);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [detalle, setDetalle] = useState<EmpresaDetalle | null>(null);
  const [dandoDeBaja, setDandoDeBaja] = useState<Empresa | null>(null);

  function abrirCreacion() {
    setForm(formVacio);
    setError(null);
    setMostrarForm(true);
  }

  function abrirEdicion(empresa: Empresa, e: React.MouseEvent) {
    e.stopPropagation();
    setForm({
      razonSocial: empresa.razonSocial,
      cuit: empresa.cuit ?? "",
      industria: empresa.industria ?? "",
      email: empresa.email ?? "",
      telefono: empresa.telefono ?? "",
      direccion: empresa.direccion ?? "",
      sitioWeb: empresa.sitioWeb ?? "",
      estado: empresa.estado,
      origenId: empresa.origenId ? String(empresa.origenId) : "",
      observaciones: empresa.observaciones ?? "",
      responsableId: empresa.responsableId ? String(empresa.responsableId) : "",
    });
    setError(null);
    setEditando(empresa);
  }

  function abrirBaja(empresa: Empresa, e: React.MouseEvent) {
    e.stopPropagation();
    setDandoDeBaja(empresa);
  }

  async function confirmarBaja(contactarNuevamente: boolean, motivoBaja?: string) {
    if (!dandoDeBaja) return;
    await api.post(`/empresas/${dandoDeBaja.id}/baja`, { contactarNuevamente, motivoBaja });
    setDandoDeBaja(null);
    listado.recargar();
  }

  // Un vendedor ve también lo que cargó y después se reasignó a otro, pero
  // solo para consultarlo: editar y dar de baja es del responsable actual.
  function motivoSoloLectura(empresa: Empresa) {
    if (veTodo(usuario?.rol) || empresa.responsableId === usuario?.id) return null;
    return "Asignado a otro vendedor: solo podés consultarlo";
  }

  function motivoBajaBloqueada(empresa: Empresa) {
    const soloLectura = motivoSoloLectura(empresa);
    if (soloLectura) return soloLectura;
    if (empresa.estado === "NO_CONTACTAR") return "Ya está en No contactar";
    if (empresa.oportunidadAbiertaId != null) return "Tiene una oportunidad abierta";
    return null;
  }

  async function abrirDetalle(id: number) {
    const res = await api.get(`/empresas/${id}`);
    setDetalle(res.data);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      ...form,
      responsableId: form.responsableId ? Number(form.responsableId) : null,
      origenId: form.origenId ? Number(form.origenId) : null,
    };
    try {
      if (editando) {
        await api.put(`/empresas/${editando.id}`, payload);
        setEditando(null);
      } else {
        await api.post("/empresas", payload);
        setMostrarForm(false);
      }
      listado.recargar();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "No se pudo guardar la empresa");
    }
  }

  const formActivo = mostrarForm || editando !== null;
  const estadoBloqueado = editando?.oportunidadAbiertaId != null;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h2>Empresas</h2>
          <p>Convenios corporativos que pagan la membresía de sus empleados.</p>
        </div>
        <div className="toolbar">
          <div className="search-input">
            <SearchIcon />
            <input
              placeholder="Buscar por razón social, CUIT o email"
              value={listado.busqueda}
              onChange={(e) => listado.setBusqueda(e.target.value)}
              aria-label="Buscar empresas"
            />
          </div>
          <button className="btn" onClick={abrirCreacion}>
            + Nueva empresa
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <select className="filter-select" value={filtros.estado} onChange={(e) => cambiar("estado", e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ESTADOS.map((es) => (
            <option key={es} value={es}>
              {ESTADO_LABEL[es]}
            </option>
          ))}
        </select>
        {verEquipo && (
          <select
            className="filter-select"
            value={filtros.responsableId}
            onChange={(e) => cambiar("responsableId", e.target.value)}
            aria-label="Responsable"
          >
            <option value="">Todos los responsables</option>
            {equipo.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} {u.apellido}
              </option>
            ))}
          </select>
        )}
        <select className="filter-select" value={filtros.origenId} onChange={(e) => cambiar("origenId", e.target.value)} aria-label="Origen">
          <option value="">Todos los orígenes</option>
          {origenes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>
        {listado.hayFiltros && (
          <button type="button" className="link-btn" onClick={listado.limpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      {listado.error && <div className="error-box">{listado.error}</div>}

      <div className="card">
        <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Razón social</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Responsable</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {listado.items.map((emp) => (
              <tr key={emp.id} onClick={() => abrirDetalle(emp.id)}>
                <td className="cell-primary">{emp.razonSocial}</td>
                <td className="cell-muted">{emp.email || "—"}</td>
                <td className="cell-muted">{emp.telefono || "—"}</td>
                <td>
                  {emp.responsable ? (
                    <div className="cell-user">
                      <Avatar nombre={emp.responsable.nombre} apellido={emp.responsable.apellido} size={24} />
                      <span className="cell-muted">{emp.responsable.nombre}</span>
                    </div>
                  ) : (
                    <span className="cell-muted">Sin asignar</span>
                  )}
                </td>
                <td>
                  <Badge value={emp.estado} />
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-btn baja-button"
                      onClick={(e) => abrirBaja(emp, e)}
                      disabled={motivoBajaBloqueada(emp) !== null}
                      title={motivoBajaBloqueada(emp) ?? "Dar de baja"}
                      aria-label="Dar de baja"
                    >
                      <BajaIcon />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={(e) => abrirEdicion(emp, e)}
                      disabled={motivoSoloLectura(emp) !== null}
                      title={motivoSoloLectura(emp) ?? "Editar"}
                      aria-label="Editar"
                    >
                      <PencilIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {listado.cargado && listado.items.length === 0 && (
              <tr className="row-empty">
                <td colSpan={6} className="empty-state">
                  {listado.hayFiltros ? "Ninguna empresa coincide con estos filtros." : "Todavía no hay empresas cargadas"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Paginacion total={listado.total} page={listado.page} pageSize={listado.pageSize} onPage={listado.setPage} />
      </div>

      {formActivo && (
        <Modal title={editando ? "Editar empresa" : "Nueva empresa"} onClose={() => (editando ? setEditando(null) : setMostrarForm(false))}>
          <form onSubmit={handleSubmit}>
            {error && <div className="error-box">{error}</div>}
            <div className="form-grid">
              <label>
                Razón social *
                <input required value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} />
              </label>
              <label>
                CUIT
                <input value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
              </label>
              <label>
                Industria
                <input value={form.industria} onChange={(e) => setForm({ ...form, industria: e.target.value })} />
              </label>
              <label>
                Estado{estadoBloqueado ? " (oportunidad abierta)" : ""}
                <select disabled={estadoBloqueado} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  {ESTADOS.map((es) => (
                    <option key={es} value={es}>
                      {es}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Email
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label>
                Teléfono
                <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </label>
              <label>
                Dirección
                <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
              </label>
              <label>
                Sitio web
                <input value={form.sitioWeb} onChange={(e) => setForm({ ...form, sitioWeb: e.target.value })} />
              </label>
              <ResponsableSelect
                value={form.responsableId}
                onChange={(responsableId) => setForm((f) => ({ ...f, responsableId }))}
              />
              <label>
                Origen
                <CatalogoSelect
                  catalogo="origenes"
                  value={form.origenId}
                  actual={editando?.origen}
                  onChange={(origenId) => setForm((f) => ({ ...f, origenId }))}
                />
              </label>
              <label className="span-2">
                Observaciones
                <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={() => (editando ? setEditando(null) : setMostrarForm(false))}>
                Cancelar
              </button>
              <button type="submit" className="btn">
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {dandoDeBaja && (
        <BajaModal
          nombre={dandoDeBaja.razonSocial}
          cancelaInscripcion={dandoDeBaja.estado === "CLIENTE"}
          onClose={() => setDandoDeBaja(null)}
          onConfirm={confirmarBaja}
        />
      )}

      {detalle && (
        <Modal title={detalle.razonSocial} onClose={() => setDetalle(null)} width={640}>
          <dl className="detail-grid">
            <div className="detail-item">
              <dt>Estado</dt>
              <dd>
                <Badge value={detalle.estado} />
              </dd>
            </div>
            <div className="detail-item">
              <dt>Responsable</dt>
              <dd>{detalle.responsable ? `${detalle.responsable.nombre} ${detalle.responsable.apellido}` : "Sin asignar"}</dd>
            </div>
            <div className="detail-item">
              <dt>CUIT</dt>
              <dd>{detalle.cuit || "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>Industria</dt>
              <dd>{detalle.industria || "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>Email</dt>
              <dd>{detalle.email || "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>Teléfono</dt>
              <dd>{detalle.telefono || "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>Dirección</dt>
              <dd>{detalle.direccion || "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>Origen</dt>
              <dd>{detalle.origen?.nombre ?? "—"}</dd>
            </div>
          </dl>
          {detalle.observaciones && (
            <div className="detail-section">
              <h4>Observaciones</h4>
              <p>{detalle.observaciones}</p>
            </div>
          )}
          <div className="detail-section">
            <h4>Contactos ({detalle.contactos.length})</h4>
            <div className="related-list">
              {detalle.contactos.map((c) => (
                <div className="related-row" key={c.id}>
                  <span>
                    {c.nombre} {c.apellido}
                  </span>
                </div>
              ))}
              {detalle.contactos.length === 0 && <p className="cell-muted">Sin contactos asociados</p>}
            </div>
          </div>
          <div className="detail-section">
            <h4>Oportunidades ({detalle.oportunidades.length})</h4>
            <div className="related-list">
              {detalle.oportunidades.map((o) => (
                <div className="related-row" key={o.id}>
                  <span>{o.titulo}</span>
                  <span className="cell-muted">{o.etapa.nombre}</span>
                </div>
              ))}
              {detalle.oportunidades.length === 0 && <p className="cell-muted">Sin oportunidades asociadas</p>}
            </div>
          </div>
          <HistorialComercial
            entidad={{ empresaId: detalle.id }}
            nombreEntidad={detalle.razonSocial}
            motivoSoloLectura={motivoSoloLectura(detalle)}
          />
        </Modal>
      )}
    </div>
  );
}
