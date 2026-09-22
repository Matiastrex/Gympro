import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Badge } from "../components/Badge";
import { PencilIcon, SearchIcon } from "../components/icons";

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
  origen?: string | null;
  observaciones?: string | null;
}

interface EmpresaDetalle extends Empresa {
  contactos: { id: number; nombre: string; apellido: string }[];
  oportunidades: { id: number; titulo: string; etapa: { nombre: string } }[];
}

const ESTADOS = ["POTENCIAL", "CLIENTE", "INACTIVO", "NO_CONTACTAR"];

const formVacio = {
  razonSocial: "",
  cuit: "",
  industria: "",
  email: "",
  telefono: "",
  direccion: "",
  sitioWeb: "",
  estado: "POTENCIAL",
  origen: "",
  observaciones: "",
};

export function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(formVacio);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [detalle, setDetalle] = useState<EmpresaDetalle | null>(null);

  async function cargar(q?: string) {
    const res = await api.get("/empresas", { params: q ? { q } : undefined });
    setEmpresas(res.data);
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
      origen: empresa.origen ?? "",
      observaciones: empresa.observaciones ?? "",
    });
    setError(null);
    setEditando(empresa);
  }

  async function abrirDetalle(id: number) {
    const res = await api.get(`/empresas/${id}`);
    setDetalle(res.data);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editando) {
        await api.put(`/empresas/${editando.id}`, form);
        setEditando(null);
      } else {
        await api.post("/empresas", form);
        setMostrarForm(false);
      }
      await cargar(search || undefined);
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
              placeholder="Buscar por razón social o email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn" onClick={abrirCreacion}>
            + Nueva empresa
          </button>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Razón social</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((emp) => (
              <tr key={emp.id} onClick={() => abrirDetalle(emp.id)}>
                <td className="cell-primary">{emp.razonSocial}</td>
                <td className="cell-muted">{emp.email || "—"}</td>
                <td className="cell-muted">{emp.telefono || "—"}</td>
                <td>
                  <Badge value={emp.estado} />
                </td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" onClick={(e) => abrirEdicion(emp, e)} aria-label="Editar">
                      <PencilIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr className="row-empty">
                <td colSpan={5} className="empty-state">
                  Todavía no hay empresas cargadas
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
        <Modal title={detalle.razonSocial} onClose={() => setDetalle(null)}>
          <dl className="detail-grid">
            <div className="detail-item">
              <dt>Estado</dt>
              <dd>
                <Badge value={detalle.estado} />
              </dd>
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
        </Modal>
      )}
    </div>
  );
}
