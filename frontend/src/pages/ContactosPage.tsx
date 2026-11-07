import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { BajaModal } from "../components/BajaModal";
import { ResponsableSelect } from "../components/ResponsableSelect";
import { HistorialComercial } from "../components/HistorialComercial";
import { useAuth } from "../context/AuthContext";
import { veTodo } from "../constants/roles";
import { BajaIcon, PencilIcon, SearchIcon } from "../components/icons";

interface Empresa {
  id: number;
  razonSocial: string;
  estado: string;
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
  origen?: string | null;
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
};

export function ContactosPage() {
  const { usuario } = useAuth();
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(formVacio);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Contacto | null>(null);
  const [detalle, setDetalle] = useState<ContactoDetalle | null>(null);
  const [dandoDeBaja, setDandoDeBaja] = useState<Contacto | null>(null);

  async function cargar(q?: string) {
    const [resContactos, resEmpresas] = await Promise.all([
      api.get("/contactos", { params: q ? { q } : undefined }),
      api.get("/empresas"),
    ]);
    setContactos(resContactos.data);
    setEmpresas(resEmpresas.data);
  }

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => cargar(search || undefined), 250);
    return () => clearTimeout(t);
  }, [search]);

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
    await cargar(search || undefined);
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
      responsableId: form.responsableId ? Number(form.responsableId) : null,
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
      await cargar(search || undefined);
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
            <input placeholder="Buscar por nombre o email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn" onClick={abrirCreacion}>
            + Nuevo contacto
          </button>
        </div>
      </div>

      <div className="card table-card">
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
            {contactos.map((c) => (
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
            {contactos.length === 0 && (
              <tr className="row-empty">
                <td colSpan={7} className="empty-state">
                  Todavía no hay contactos cargados
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
              <ResponsableSelect
                className="span-2"
                value={form.responsableId}
                onChange={(responsableId) => setForm((f) => ({ ...f, responsableId }))}
              />
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
