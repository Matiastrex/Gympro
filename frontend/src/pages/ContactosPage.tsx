import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Badge, ESTADO_LABEL } from "../components/Badge";
import { Paginacion } from "../components/Paginacion";
import { useListadoPaginado } from "../hooks/useListadoPaginado";
import { useEquipo } from "../hooks/useEquipo";
import { Avatar } from "../components/Avatar";
import { BajaModal } from "../components/BajaModal";
import { ResponsableSelect } from "../components/ResponsableSelect";
import { CatalogoSelect, useCatalogo } from "../components/CatalogoSelect";
import type { RefCatalogo } from "../types/configuracion";
import { HistorialComercial } from "../components/HistorialComercial";
import { useAuth } from "../context/AuthContext";
import { veTodo } from "../constants/roles";
import { BajaIcon, PencilIcon, SearchIcon } from "../components/icons";

interface Empresa {
  id: number;
  razonSocial: string;
  estado: string;
  responsableId?: number | null;
  responsable?: { id: number; nombre: string; apellido: string } | null;
}

interface Contacto {
  id: number;
  nombre: string;
  apellido: string;
  documento?: string | null;
  cargo?: string | null;
  email?: string | null;
  telefono?: string | null;
  estado: string;
  origenId?: number | null;
  origen?: RefCatalogo | null;
  observaciones?: string | null;
  oportunidadAbiertaId?: number | null;
  empresaId?: number | null;
  empresa?: { id: number; razonSocial: string } | null;
  responsableId?: number | null;
  responsable?: { id: number; nombre: string; apellido: string } | null;
}

interface ContactoDetalle extends Contacto {
  oportunidades: { id: number; titulo: string; etapa: { nombre: string } }[];
}

const ESTADOS = ["POTENCIAL", "CLIENTE", "INACTIVO", "NO_CONTACTAR"];

const filtrosVacios = { estado: "", responsableId: "", origenId: "", empresaId: "" };

const formVacio = {
  nombre: "",
  apellido: "",
  documento: "",
  cargo: "",
  email: "",
  telefono: "",
  empresaId: "",
  estado: "POTENCIAL",
  observaciones: "",
  responsableId: "",
  origenId: "",
};

export function ContactosPage() {
  const { usuario } = useAuth();
  const verEquipo = veTodo(usuario?.rol);
  const listado = useListadoPaginado<Contacto, typeof filtrosVacios>("/contactos", filtrosVacios);
  const { filtros, cambiar } = listado;
  const equipo = useEquipo(verEquipo);
  const origenes = useCatalogo("origenes");
  // Todas las empresas visibles (sin paginar): alimentan el filtro y el select del formulario.
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [form, setForm] = useState(formVacio);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Contacto | null>(null);
  const [detalle, setDetalle] = useState<ContactoDetalle | null>(null);
  const [dandoDeBaja, setDandoDeBaja] = useState<Contacto | null>(null);

  useEffect(() => {
    api.get<Empresa[]>("/empresas").then((res) => setEmpresas(res.data));
  }, []);

  function abrirCreacion() {
    setForm(formVacio);
    setError(null);
    setMostrarForm(true);
  }

  function abrirEdicion(contacto: Contacto, e: React.MouseEvent) {
    e.stopPropagation();
    setForm({
      nombre: contacto.nombre,
      apellido: contacto.apellido,
      documento: contacto.documento ?? "",
      cargo: contacto.cargo ?? "",
      email: contacto.email ?? "",
      telefono: contacto.telefono ?? "",
      empresaId: contacto.empresaId ? String(contacto.empresaId) : "",
      estado: contacto.estado,
      observaciones: contacto.observaciones ?? "",
      responsableId: contacto.responsableId ? String(contacto.responsableId) : "",
      origenId: contacto.origenId ? String(contacto.origenId) : "",
    });
    setError(null);
    setEditando(contacto);
  }

  function abrirBaja(contacto: Contacto, e: React.MouseEvent) {
    e.stopPropagation();
    setDandoDeBaja(contacto);
  }

  async function confirmarBaja(contactarNuevamente: boolean, motivoBaja?: string) {
    if (!dandoDeBaja) return;
    await api.post(`/contactos/${dandoDeBaja.id}/baja`, { contactarNuevamente, motivoBaja });
    setDandoDeBaja(null);
    listado.recargar();
  }

  // Un vendedor ve también lo que cargó y después se reasignó a otro, pero
  // solo para consultarlo: editar y dar de baja es del responsable actual.
  function motivoSoloLectura(contacto: Contacto) {
    if (veTodo(usuario?.rol) || contacto.responsableId === usuario?.id) return null;
    return "Asignado a otro vendedor: solo podés consultarlo";
  }

  function motivoBajaBloqueada(contacto: Contacto) {
    const soloLectura = motivoSoloLectura(contacto);
    if (soloLectura) return soloLectura;
    if (contacto.estado === "NO_CONTACTAR") return "Ya está en No contactar";
    if (contacto.oportunidadAbiertaId != null) return "Tiene una oportunidad abierta";
    if (contacto.empresaId != null) return "El estado depende de su empresa";
    return null;
  }

  async function abrirDetalle(id: number) {
    const res = await api.get(`/contactos/${id}`);
    setDetalle(res.data);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      ...form,
      empresaId: form.empresaId ? Number(form.empresaId) : null,
      responsableId: responsablePorEmpresa
        ? Number(responsablePorEmpresa)
        : form.responsableId
          ? Number(form.responsableId)
          : null,
      origenId: form.origenId ? Number(form.origenId) : null,
      estado: estadoPorEmpresa ?? form.estado,
    };
    try {
      if (editando) {
        await api.put(`/contactos/${editando.id}`, payload);
        setEditando(null);
      } else {
        await api.post("/contactos", payload);
        setMostrarForm(false);
      }
      listado.recargar();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "No se pudo guardar el contacto");
    }
  }

  const formActivo = mostrarForm || editando !== null;
  const empresaSeleccionada = empresas.find((empresa) => empresa.id === Number(form.empresaId));
  const estadoPorEmpresa = empresaSeleccionada
    ? empresaSeleccionada.estado === "NO_CONTACTAR"
      ? "INACTIVO"
      : empresaSeleccionada.estado
    : null;
  const responsablePorEmpresa = empresaSeleccionada
    ? empresaSeleccionada.responsableId
      ? String(empresaSeleccionada.responsableId)
      : ""
    : null;
  const estadoBloqueadoPorOportunidad = !empresaSeleccionada && editando?.oportunidadAbiertaId != null;
  const estadoBloqueado = Boolean(empresaSeleccionada) || estadoBloqueadoPorOportunidad;
  const estadoLabel = empresaSeleccionada
    ? "Estado (por empresa)"
    : estadoBloqueadoPorOportunidad
      ? "Estado (Oportunidad abierta)"
      : "Estado";

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h2>Contactos</h2>
          <p>Socios y personas interesadas en el gimnasio.</p>
        </div>
        <div className="toolbar">
          <div className="search-input">
            <SearchIcon />
            <input
              placeholder="Buscar por nombre, email o documento"
              value={listado.busqueda}
              onChange={(e) => listado.setBusqueda(e.target.value)}
              aria-label="Buscar contactos"
            />
          </div>
          <button className="btn" onClick={abrirCreacion}>
            + Nuevo contacto
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
        <select className="filter-select" value={filtros.empresaId} onChange={(e) => cambiar("empresaId", e.target.value)} aria-label="Empresa">
          <option value="">Todas las empresas</option>
          {empresas.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.razonSocial}
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
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Empresa</th>
              <th>Responsable</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {listado.items.map((c) => (
              <tr key={c.id} onClick={() => abrirDetalle(c.id)}>
                <td>
                  <div className="cell-user">
                    <Avatar nombre={c.nombre} apellido={c.apellido} />
                    <span className="cell-primary">
                      {c.nombre} {c.apellido}
                    </span>
                  </div>
                </td>
                <td className="cell-muted">{c.email || "—"}</td>
                <td className="cell-muted">{c.telefono || "—"}</td>
                <td className="cell-muted">{c.empresa?.razonSocial ?? "—"}</td>
                <td>
                  {c.responsable ? (
                    <div className="cell-user">
                      <Avatar nombre={c.responsable.nombre} apellido={c.responsable.apellido} size={24} />
                      <span className="cell-muted">{c.responsable.nombre}</span>
                    </div>
                  ) : (
                    <span className="cell-muted">Sin asignar</span>
                  )}
                </td>
                <td>
                  <Badge value={c.estado} />
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-btn baja-button"
                      onClick={(e) => abrirBaja(c, e)}
                      disabled={motivoBajaBloqueada(c) !== null}
                      title={motivoBajaBloqueada(c) ?? "Dar de baja"}
                      aria-label="Dar de baja"
                    >
                      <BajaIcon />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={(e) => abrirEdicion(c, e)}
                      disabled={motivoSoloLectura(c) !== null}
                      title={motivoSoloLectura(c) ?? "Editar"}
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
                <td colSpan={7} className="empty-state">
                  {listado.hayFiltros ? "Ningún contacto coincide con estos filtros." : "Todavía no hay contactos cargados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Paginacion total={listado.total} page={listado.page} pageSize={listado.pageSize} onPage={listado.setPage} />
      </div>

      {formActivo && (
        <Modal title={editando ? "Editar contacto" : "Nuevo contacto"} onClose={() => (editando ? setEditando(null) : setMostrarForm(false))}>
          <form onSubmit={handleSubmit}>
            {error && <div className="error-box">{error}</div>}
            <div className="form-grid">
              <label>
                Nombre *
                <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </label>
              <label>
                Apellido *
                <input required value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
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
                Documento
                <input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
              </label>
              <label>
                Cargo
                <input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
              </label>
              <label>
                Convenio corporativo
                <select value={form.empresaId} onChange={(e) => setForm({ ...form, empresaId: e.target.value })}>
                  <option value="">Cliente individual</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.razonSocial}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {estadoLabel}
                <select
                  disabled={estadoBloqueado}
                  value={estadoPorEmpresa ?? form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  {ESTADOS.map((es) => (
                    <option key={es} value={es}>
                      {es}
                    </option>
                  ))}
                </select>
              </label>
              {empresaSeleccionada ? (
                <label>
                  Responsable (por empresa)
                  <select disabled value={responsablePorEmpresa ?? ""}>
                    {empresaSeleccionada.responsable ? (
                      <option value={empresaSeleccionada.responsable.id}>
                        {empresaSeleccionada.responsable.nombre} {empresaSeleccionada.responsable.apellido}
                      </option>
                    ) : (
                      <option value="">Sin asignar</option>
                    )}
                  </select>
                </label>
              ) : (
                <ResponsableSelect
                  value={form.responsableId}
                  onChange={(responsableId) => setForm((f) => ({ ...f, responsableId }))}
                />
              )}
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
          nombre={`${dandoDeBaja.nombre} ${dandoDeBaja.apellido}`}
          cancelaInscripcion={dandoDeBaja.estado === "CLIENTE"}
          onClose={() => setDandoDeBaja(null)}
          onConfirm={confirmarBaja}
        />
      )}

      {detalle && (
        <Modal title={`${detalle.nombre} ${detalle.apellido}`} onClose={() => setDetalle(null)} width={640}>
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
              <dt>Empresa</dt>
              <dd>{detalle.empresa?.razonSocial ?? "Cliente individual"}</dd>
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
              <dt>Cargo</dt>
              <dd>{detalle.cargo || "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>Documento</dt>
              <dd>{detalle.documento || "—"}</dd>
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
            entidad={{ contactoId: detalle.id }}
            nombreEntidad={`${detalle.nombre} ${detalle.apellido}`}
            motivoSoloLectura={motivoSoloLectura(detalle)}
          />
        </Modal>
      )}
    </div>
  );
}
