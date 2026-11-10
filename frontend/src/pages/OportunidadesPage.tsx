import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Badge, ESTADO_LABEL } from "../components/Badge";
import { Paginacion } from "../components/Paginacion";
import { useListadoPaginado } from "../hooks/useListadoPaginado";
import { useEquipo } from "../hooks/useEquipo";
import { useAuth } from "../context/AuthContext";
import { veTodo } from "../constants/roles";
import { Avatar } from "../components/Avatar";
import { PencilIcon, SearchIcon } from "../components/icons";
import { HistorialComercial } from "../components/HistorialComercial";
import { Reapertura, ReaperturaPendiente } from "../components/Reapertura";
import { ResponsableSelect } from "../components/ResponsableSelect";
import { CatalogoSelect, useCatalogo } from "../components/CatalogoSelect";
import type { RefCatalogo } from "../types/configuracion";

interface Opcion {
  id: number;
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  tipo?: string;
  responsableId?: number | null;
  empresaId?: number | null;
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
  origenId?: number | null;
  origen?: RefCatalogo | null;
  motivoPerdidaId?: number | null;
  motivoPerdida?: RefCatalogo | null;
  motivoPerdidaDetalle?: string | null;
  observaciones?: string | null;
}

interface OportunidadDetalle extends Oportunidad {
  solicitudesReapertura?: ReaperturaPendiente[];
}

// Un vendedor solo recibe sus propios contactos/empresas. Si se le reasignó
// una oportunidad vinculada a uno ajeno, se agrega igual como opción para que
// el formulario lo muestre (el backend acepta conservar ese vínculo).
function conVinculoActual(opciones: Opcion[], id: number | null | undefined, actual: Omit<Opcion, "id"> | null | undefined) {
  if (id == null || !actual || opciones.some((o) => o.id === id)) return opciones;
  return [{ id, ...actual }, ...opciones];
}

const ESTADOS_OPORTUNIDAD = ["ABIERTA", "GANADA", "PERDIDA", "BAJA"];

const filtrosVacios = { etapaId: "", estado: "", responsableId: "", origenId: "" };

const formVacio = {
  titulo: "",
  contactoId: "",
  empresaId: "",
  productoId: "",
  responsableId: "",
  etapaId: "",
  valorEstimado: "",
  origenId: "",
  motivoPerdidaId: "",
  motivoPerdidaDetalle: "",
  observaciones: "",
  motivoEdicion: "",
};

const CERRADA_SOLO_ADMIN = "Está cerrada: solo un administrador puede corregirla";

export function OportunidadesPage() {
  const { usuario } = useAuth();
  const verEquipo = veTodo(usuario?.rol);
  const esAdmin = usuario?.rol === "ADMINISTRADOR";
  const listado = useListadoPaginado<Oportunidad, typeof filtrosVacios>("/oportunidades", filtrosVacios);
  const { filtros, cambiar } = listado;
  const equipo = useEquipo(verEquipo);
  const origenes = useCatalogo("origenes");
  const [contactos, setContactos] = useState<Opcion[]>([]);
  const [empresas, setEmpresas] = useState<Opcion[]>([]);
  const [productos, setProductos] = useState<Opcion[]>([]);
  const [etapas, setEtapas] = useState<Opcion[]>([]);
  const [form, setForm] = useState(formVacio);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Oportunidad | null>(null);
  const [detalle, setDetalle] = useState<OportunidadDetalle | null>(null);

  // Opciones de los selects (listas completas, sin paginar).
  async function cargarOpciones() {
    const [cs, es, ps, et] = await Promise.all([
      api.get("/contactos"),
      api.get("/empresas"),
      api.get("/productos"),
      api.get("/etapas"),
    ]);
    setContactos(cs.data);
    setEmpresas(es.data);
    setProductos(ps.data);
    setEtapas(et.data);
  }

  useEffect(() => {
    cargarOpciones();
  }, []);

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
      origenId: o.origenId ? String(o.origenId) : "",
      motivoPerdidaId: o.motivoPerdidaId ? String(o.motivoPerdidaId) : "",
      motivoPerdidaDetalle: o.motivoPerdidaDetalle ?? "",
      observaciones: o.observaciones ?? "",
      motivoEdicion: "",
    });
    setError(null);
    setEditando(o);
  }

  async function abrirDetalle(id: number) {
    const res = await api.get(`/oportunidades/${id}`);
    setDetalle(res.data);
  }

  async function recargarTrasReapertura(id: number) {
    listado.recargar();
    await abrirDetalle(id);
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
      origenId: form.origenId ? Number(form.origenId) : null,
      ...(mostrarMotivoPerdida
        ? { motivoPerdidaId: Number(form.motivoPerdidaId), motivoPerdidaDetalle: form.motivoPerdidaDetalle || null }
        : { motivoPerdidaId: null, motivoPerdidaDetalle: null }),
      observaciones: form.observaciones || null,
      ...(editandoCerrada ? { motivoEdicion: form.motivoEdicion.trim() } : {}),
    };
    try {
      if (editando) {
        await api.put(`/oportunidades/${editando.id}`, payload);
        setEditando(null);
      } else {
        await api.post("/oportunidades", payload);
        setMostrarForm(false);
      }
      listado.recargar();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "No se pudo guardar la oportunidad");
    }
  }

  const formActivo = mostrarForm || editando !== null;
  // Corregir una oportunidad cerrada: solo el admin, sin cambiar la etapa, y con
  // un motivo que queda en el historial junto con cada campo modificado.
  const editandoCerrada = editando !== null && editando.estado !== "ABIERTA";
  const contactosSinConvenio = contactos.filter((contacto) => contacto.empresaId == null);
  const opcionesContacto = conVinculoActual(contactosSinConvenio, editando?.contactoId, editando?.contacto);
  const opcionesEmpresa = conVinculoActual(empresas, editando?.empresaId, editando?.empresa);
  const etapaSeleccionada = etapas.find((et) => et.id === Number(form.etapaId));
  const mostrarMotivoPerdida = editando !== null && etapaSeleccionada?.tipo == "PERDIDA";
  // "Inscripción cancelada" solo es una opción válida si la oportunidad que se está editando está
  // actualmente en Inscripto (tipo GANADA); en creación, o editando cualquier
  // otra etapa, no se debe poder elegir Inscripción cancelada directamente desde este formulario.
  const etapaActualTipo = editando ? etapas.find((et) => et.id === editando.etapaId)?.tipo : undefined;
  const etapasSeleccionables = etapas.filter((et) => et.tipo !== "BAJA" || etapaActualTipo === "GANADA");

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
            <input
              placeholder="Buscar por título, contacto o empresa"
              value={listado.busqueda}
              onChange={(e) => listado.setBusqueda(e.target.value)}
              aria-label="Buscar oportunidades"
            />
          </div>
          <button className="btn" onClick={abrirCreacion}>
            + Nueva oportunidad
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <select className="filter-select" value={filtros.etapaId} onChange={(e) => cambiar("etapaId", e.target.value)} aria-label="Etapa">
          <option value="">Todas las etapas</option>
          {etapas.map((et) => (
            <option key={et.id} value={et.id}>
              {et.nombre}
            </option>
          ))}
        </select>
        <select className="filter-select" value={filtros.estado} onChange={(e) => cambiar("estado", e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ESTADOS_OPORTUNIDAD.map((es) => (
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
        <div className="table-card table-wide">
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
            {listado.items.map((o) => (
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
                    <button
                      className="icon-btn"
                      onClick={(e) => abrirEdicion(o, e)}
                      aria-label="Editar"
                      disabled={o.estado !== "ABIERTA" && !esAdmin}
                      title={o.estado !== "ABIERTA" && !esAdmin ? CERRADA_SOLO_ADMIN : undefined}
                    >
                      <PencilIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {listado.cargado && listado.items.length === 0 && (
              <tr className="row-empty">
                <td colSpan={8} className="empty-state">
                  {listado.hayFiltros ? "Ninguna oportunidad coincide con estos filtros." : "Todavía no hay oportunidades cargadas"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Paginacion total={listado.total} page={listado.page} pageSize={listado.pageSize} onPage={listado.setPage} />
      </div>

      {formActivo && (
        <Modal title={editando ? "Editar oportunidad" : "Nueva oportunidad"} onClose={() => (editando ? setEditando(null) : setMostrarForm(false))}>
          <form onSubmit={handleSubmit}>
            {error && <div className="error-box">{error}</div>}
            {editandoCerrada && (
              <div className="reapertura-callout is-form">
                <p>
                  Esta oportunidad está cerrada ({ESTADO_LABEL[editando.estado] ?? editando.estado}). Podés corregir sus
                  datos, pero no su etapa, y cada cambio queda registrado en el historial con tu nombre y el motivo.
                </p>
              </div>
            )}
            <div className="form-grid">
              <label className="span-2">
                Título *
                <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
              </label>
              <label>
                Etapa *
                <select
                  required
                  disabled={editandoCerrada}
                  title={editandoCerrada ? "La etapa de una oportunidad cerrada no se cambia desde acá" : undefined}
                  value={form.etapaId}
                  onChange={(e) => {
                    const etapaId = e.target.value;
                    const etapa = etapas.find((et) => et.id === Number(etapaId));
                    setForm({
                      ...form,
                      etapaId,
                      ...(etapa?.tipo === "PERDIDA" ? {} : { motivoPerdidaId: "", motivoPerdidaDetalle: "" }),
                    });
                  }}
                >
                  <option value="">Elegir...</option>
                  {etapasSeleccionables.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <ResponsableSelect
                value={form.responsableId}
                onChange={(responsableId) => setForm((f) => ({ ...f, responsableId }))}
              />
              {mostrarMotivoPerdida && (
                <>
                  <label>
                    Motivo de pérdida *
                    <CatalogoSelect
                      catalogo="motivos-perdida"
                      required
                      value={form.motivoPerdidaId}
                      actual={editando?.motivoPerdida}
                      onChange={(motivoPerdidaId) => setForm((f) => ({ ...f, motivoPerdidaId }))}
                    />
                  </label>
                  <label>
                    Detalle
                    <input
                      placeholder="Opcional"
                      value={form.motivoPerdidaDetalle}
                      onChange={(e) => setForm({ ...form, motivoPerdidaDetalle: e.target.value })}
                    />
                  </label>
                </>
              )}
              <label>
                Contacto
                <select
                  disabled={editando ? true : false}
                  value={form.contactoId}
                  onChange={(e) => {
                    const contactoId = e.target.value;
                    const contacto = contactos.find((c) => c.id === Number(contactoId));
                    setForm((actual) => ({
                      ...actual,
                      contactoId,
                      empresaId: "",
                      responsableId: actual.responsableId || !contacto?.responsableId
                        ? actual.responsableId
                        : String(contacto.responsableId),
                    }));
                  }}
                >
                  <option value="">— ninguno —</option>
                  {opcionesContacto.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellido}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Empresa (convenio corporativo)
                <select
                  disabled={editando ? true : false}
                  value={form.empresaId}
                  onChange={(e) => {
                    const empresaId = e.target.value;
                    const empresa = empresas.find((emp) => emp.id === Number(empresaId));
                    setForm((actual) => ({
                      ...actual,
                      empresaId,
                      contactoId: "",
                      responsableId: actual.responsableId || !empresa?.responsableId
                        ? actual.responsableId
                        : String(empresa.responsableId),
                    }));
                  }}
                >
                  <option value="">— ninguna —</option>
                  {opcionesEmpresa.map((emp) => (
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
              {editandoCerrada && (
                <label className="span-2">
                  Motivo de la corrección *
                  <textarea
                    required
                    placeholder="Por qué se corrige una oportunidad ya cerrada (queda en el historial)"
                    value={form.motivoEdicion}
                    onChange={(e) => setForm({ ...form, motivoEdicion: e.target.value })}
                  />
                </label>
              )}
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
        <Modal title={detalle.titulo} onClose={() => setDetalle(null)} width={640}>
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
            <div className="detail-item">
              <dt>Origen</dt>
              <dd>{detalle.origen?.nombre ?? "—"}</dd>
            </div>
            {detalle.motivoPerdida && (
              <div className="detail-item">
                <dt>Motivo de pérdida</dt>
                <dd>
                  {detalle.motivoPerdida.nombre}
                  {detalle.motivoPerdidaDetalle && <span className="cell-muted"> — {detalle.motivoPerdidaDetalle}</span>}
                </dd>
              </div>
            )}
          </dl>
          {detalle.observaciones && (
            <div className="detail-section">
              <h4>Observaciones</h4>
              <p>{detalle.observaciones}</p>
            </div>
          )}
          <Reapertura oportunidad={detalle} onCambio={() => recargarTrasReapertura(detalle.id)} />
          <HistorialComercial
            // Al reabrirla cambia la etapa: se vuelve a pedir el historial.
            key={`${detalle.estado}-${detalle.etapa.nombre}`}
            entidad={{ oportunidadId: detalle.id }}
            nombreEntidad={detalle.titulo}
          />
        </Modal>
      )}
    </div>
  );
}
