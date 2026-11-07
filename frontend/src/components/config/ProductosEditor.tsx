import { FormEvent, useState } from "react";
import { api } from "../../api/client";
import { Modal } from "../Modal";
import { PencilIcon } from "../icons";
import { mensajeDeError } from "../../types/actividades";
import type { Producto } from "../../types/configuracion";
import { Interruptor, useFilas } from "./comun";

const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

type Form = { nombre: string; precio: string; descripcion: string; activo: boolean };
const vacio: Form = { nombre: "", precio: "", descripcion: "", activo: true };

const aPayload = (f: Form) => ({
  nombre: f.nombre,
  precio: f.precio === "" ? null : Number(f.precio),
  descripcion: f.descripcion || null,
  activo: f.activo,
});

/** Planes de membresía que el gimnasio ofrece en las oportunidades. */
export function ProductosEditor() {
  const { filas, error: errorCarga, recargar } = useFilas<Producto>("/productos");
  const [editando, setEditando] = useState<Producto | "nuevo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cambiarActivo(p: Producto, activo: boolean) {
    setError(null);
    try {
      await api.put(`/productos/${p.id}`, aPayload({ nombre: p.nombre, precio: p.precio == null ? "" : String(p.precio), descripcion: p.descripcion ?? "", activo }));
      await recargar();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo guardar el plan"));
    }
  }

  return (
    <div className="config-editor">
      <div className="config-toolbar">
        <button type="button" className="btn btn-sm" onClick={() => setEditando("nuevo")}>
          + Nuevo plan
        </button>
      </div>
      {(error || errorCarga) && <div className="error-box">{error ?? errorCarga}</div>}
      <div className="table-card config-tabla">
        <table>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Precio</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(filas ?? []).map((p) => (
              <tr key={p.id} className={`row-empty${p.activo ? "" : " row-inactiva"}`}>
                <td className="cell-primary">{p.nombre}</td>
                <td className="cell-fecha">{p.precio == null ? "—" : pesos.format(Number(p.precio))}</td>
                <td className="cell-muted">{p.descripcion || "—"}</td>
                <td>
                  <Interruptor activo={p.activo} etiqueta={`${p.nombre} activo`} onChange={(activo) => cambiarActivo(p, activo)} />
                </td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="icon-btn" onClick={() => setEditando(p)} aria-label={`Editar ${p.nombre}`} title="Editar">
                      <PencilIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="config-nota">Un plan inactivo no se ofrece en oportunidades nuevas; las anteriores lo conservan.</p>

      {editando && (
        <ProductoModal
          producto={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardado={async () => {
            setEditando(null);
            await recargar();
          }}
        />
      )}
    </div>
  );
}

function ProductoModal({ producto, onClose, onGuardado }: { producto: Producto | null; onClose: () => void; onGuardado: () => void }) {
  const [form, setForm] = useState<Form>(
    producto
      ? { nombre: producto.nombre, precio: producto.precio == null ? "" : String(Number(producto.precio)), descripcion: producto.descripcion ?? "", activo: producto.activo }
      : vacio
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (producto) await api.put(`/productos/${producto.id}`, aPayload(form));
      else await api.post("/productos", aPayload(form));
      onGuardado();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo guardar el plan"));
    }
  }

  return (
    <Modal title={producto ? "Editar plan" : "Nuevo plan"} onClose={onClose} width={480}>
      <form onSubmit={handleSubmit}>
        {error && <div className="error-box">{error}</div>}
        <div className="form-grid">
          <label className="span-2">
            Nombre *
            <input required value={form.nombre} placeholder="Ej.: Pase libre mensual" onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </label>
          <label>
            Precio mensual
            <input type="number" min={0} step={100} value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
          </label>
          <label className="config-check-label">
            Estado
            <Interruptor activo={form.activo} etiqueta="Plan activo" onChange={(activo) => setForm({ ...form, activo })} />
          </label>
          <label className="span-2">
            Descripción
            <textarea value={form.descripcion} placeholder="Qué incluye, días y horarios" onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn">
            {producto ? "Guardar cambios" : "Crear plan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
