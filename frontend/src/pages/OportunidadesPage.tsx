import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { PencilIcon, SearchIcon } from "../components/icons";

interface Opcion {
  id: number;
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
}

interface Oportunidad {
  id: number;
  titulo: string;
  estado: string;
  valorEstimado?: number | null;
  etapaId: number;
  etapa: { id: number; nombre: string };
  contactoId?: number | null;
  contacto?: { nombre: string; apellido: string } | null;
  empresaId?: number | null;
  empresa?: { razonSocial: string } | null;
  responsableId?: number | null;
  responsable?: { nombre: string; apellido: string } | null;
  productoId?: number | null;
  producto?: { nombre: string } | null;
  origen?: string | null;
  observaciones?: string | null;
}

interface OportunidadDetalle extends Oportunidad {
  historialEtapas: {
    id: number;
    fecha: string;
    observacion?: string | null;
    etapaNueva: { nombre: string };
    usuario: { nombre: string; apellido: string };
  }[];
}

const formVacio = {
  titulo: "",
  contactoId: "",
  empresaId: "",
  productoId: "",
  responsableId: "",
  etapaId: "",
  valorEstimado: "",
  observaciones: "",
};

export function OportunidadesPage() {
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [contactos, setContactos] = useState<Opcion[]>([]);
  const [empresas, setEmpresas] = useState<Opcion[]>([]);
  const [productos, setProductos] = useState<Opcion[]>([]);
  const [usuarios, setUsuarios] = useState<Opcion[]>([]);
  const [etapas, setEtapas] = useState<Opcion[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(formVacio);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Oportunidad | null>(null);
  const [detalle, setDetalle] = useState<OportunidadDetalle | null>(null);

  async function cargar() {
    const [ops, cs, es, ps, us, et] = await Promise.all([
      api.get("/oportunidades"),
      api.get("/contactos"),
      api.get("/empresas"),
      api.get("/productos"),
      api.get("/usuarios"),
      api.get("/etapas"),
    ]);
    setOportunidades(ops.data);
    setContactos(cs.data);
    setEmpresas(es.data);
    setProductos(ps.data);
    setUsuarios(us.data);
    setEtapas(et.data);
  }

  useEffect(() => {
    cargar();
  }, []);

  const oportunidadesFiltradas = oportunidades.filter((o) => {
    const texto = search.trim().toLowerCase();
    if (!texto) return true;
    const nombreRelacion = o.contacto ? `${o.contacto.nombre} ${o.contacto.apellido}` : o.empresa?.razonSocial ?? "";
    return o.titulo.toLowerCase().includes(texto) || nombreRelacion.toLowerCase().includes(texto);
  });

  function abrirCreacion() {
    setForm(formVacio);
    setError(null);
    setMostrarForm(true);
  }

  function abrirEdicion(o: Oportunidad, e: React.MouseEvent) {
    e.stopPropagation();
    setForm({
      titulo: o.titulo,
      contactoId: o.contactoId ? String(o.contactoId) : "",
      empresaId: o.empresaId ? String(o.empresaId) : "",
      productoId: o.productoId ? String(o.productoId) : "",
      responsableId: o.responsableId ? String(o.responsableId) : "",
      etapaId: String(o.etapaId),
      valorEstimado: o.valorEstimado != null ? String(o.valorEstimado) : "",
      observaciones: o.observaciones ?? "",
    });
    setError(null);
    setEditando(o);
  }

  async function abrirDetalle(id: number) {
    const res = await api.get(`/oportunidades/${id}`);
    setDetalle(res.data);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.contactoId && !form.empresaId) {
      setError("Elegí un contacto o una empresa para la oportunidad");
      return;
    }
    const payload = {
      titulo: form.titulo,
      contactoId: form.contactoId ? Number(form.contactoId) : null,
      empresaId: form.empresaId ? Number(form.empresaId) : null,
      productoId: form.productoId ? Number(form.productoId) : null,
      responsableId: form.responsableId ? Number(form.responsableId) : null,
      etapaId: Number(form.etapaId),
      valorEstimado: form.valorEstimado ? Number(form.valorEstimado) : null,
      observaciones: form.observaciones || null,
    };
    try {
      if (editando) {
        await api.put(`/oportunidades/${editando.id}`, payload);
        setEditando(null);
      } else {
        await api.post("/oportunidades", payload);
        setMostrarForm(false);
      }
      await cargar();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "No se pudo guardar la oportunidad");
    }
  }

  const formActivo = mostrarForm || editando !== null;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h2>Oportunidades</h2>
          <p>Consultas de membresía en curso.</p>
        </div>
        <div className="toolbar">
          <div className="search-input">
            <SearchIcon />
            <input placeholder="Buscar por título, contacto o empresa" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn" onClick={abrirCreacion}>
            + Nueva oportunidad
          </button>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Contacto / Empresa</th>
              <th>Responsable</th>
              <th>Plan</th>
              <th>Etapa</th>
              <th>Estado</th>
              <th>Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {oportunidadesFiltradas.map((o) => (
              <tr key={o.id} onClick={() => abrirDetalle(o.id)}>
                <td className="cell-primary">{o.titulo}</td>
                <td className="cell-muted">{o.contacto ? `${o.contacto.nombre} ${o.contacto.apellido}` : o.empresa?.razonSocial ?? "—"}</td>
                <td>
                  {o.responsable ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar nombre={o.responsable.nombre} apellido={o.responsable.apellido} size={24} />
                      <span className="cell-muted">{o.responsable.nombre}</span>
                    </div>
                  ) : (
                    <span className="cell-muted">Sin asignar</span>
                  )}
                </td>
                <td className="cell-muted">{o.producto?.nombre ?? "—"}</td>
                <td className="cell-muted">{o.etapa.nombre}</td>
                <td>
                  <Badge value={o.estado} />
                </td>
                <td className="cell-muted">{o.valorEstimado ? `$${o.valorEstimado}` : "—"}</td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" onClick={(e) => abrirEdicion(o, e)} aria-label="Editar">
                      <PencilIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {oportunidadesFiltradas.length === 0 && (
              <tr className="row-empty">
                <td colSpan={8} className="empty-state">
                  Todavía no hay oportunidades cargadas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formActivo && (
        <Modal title={editando ? "Editar oportunidad" : "Nueva oportunidad"} onClose={() => (editando ? setEditando(null) : setMostrarForm(false))}>
          <form onSubmit={handleSubmit}>
            {error && <div className="error-box">{error}</div>}
            <div className="form-grid">
              <label className="span-2">
                Título *
                <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
              </label>
              <label>
                Etapa *
                <select required value={form.etapaId} onChange={(e) => setForm({ ...form, etapaId: e.target.value })}>
                  <option value="">Elegir...</option>
                  {etapas.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Responsable
                <select value={form.responsableId} onChange={(e) => setForm({ ...form, responsableId: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Contacto
                <select value={form.contactoId} onChange={(e) => setForm({ ...form, contactoId: e.target.value })}>
                  <option value="">— ninguno —</option>
                  {contactos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellido}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Empresa (convenio corporativo)
                <select value={form.empresaId} onChange={(e) => setForm({ ...form, empresaId: e.target.value })}>
                  <option value="">— ninguna —</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.razonSocial}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Plan / servicio
                <select value={form.productoId} onChange={(e) => setForm({ ...form, productoId: e.target.value })}>
                  <option value="">— ninguno —</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Valor estimado
                <input type="number" value={form.valorEstimado} onChange={(e) => setForm({ ...form, valorEstimado: e.target.value })} />
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

      {detalle && (
        <Modal title={detalle.titulo} onClose={() => setDetalle(null)}>
          <dl className="detail-grid">
            <div className="detail-item">
              <dt>Estado</dt>
              <dd>
                <Badge value={detalle.estado} />
              </dd>
            </div>
            <div className="detail-item">
              <dt>Etapa actual</dt>
              <dd>{detalle.etapa.nombre}</dd>
            </div>
            <div className="detail-item">
              <dt>Contacto / Empresa</dt>
              <dd>{detalle.contacto ? `${detalle.contacto.nombre} ${detalle.contacto.apellido}` : detalle.empresa?.razonSocial ?? "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>Responsable</dt>
              <dd>{detalle.responsable ? `${detalle.responsable.nombre} ${detalle.responsable.apellido}` : "Sin asignar"}</dd>
            </div>
            <div className="detail-item">
              <dt>Plan / servicio</dt>
              <dd>{detalle.producto?.nombre ?? "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>Valor estimado</dt>
              <dd>{detalle.valorEstimado ? `$${detalle.valorEstimado}` : "—"}</dd>
            </div>
          </dl>
          {detalle.observaciones && (
            <div className="detail-section">
              <h4>Observaciones</h4>
              <p>{detalle.observaciones}</p>
            </div>
          )}
          <div className="detail-section">
            <h4>Historial de etapas ({detalle.historialEtapas.length})</h4>
            <div className="related-list">
              {detalle.historialEtapas.map((h) => (
                <div className="related-row" key={h.id}>
                  <span>{h.etapaNueva.nombre}</span>
                  <span className="cell-muted">
                    {new Date(h.fecha).toLocaleDateString("es-AR")} · {h.usuario.nombre}
                  </span>
                </div>
              ))}
              {detalle.historialEtapas.length === 0 && <p className="cell-muted">Sin cambios de etapa registrados</p>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
