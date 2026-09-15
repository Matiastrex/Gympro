import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

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
  valorEstimado?: number;
  etapa: { nombre: string };
  contacto?: { nombre: string; apellido: string } | null;
  empresa?: { razonSocial: string } | null;
  producto?: { nombre: string } | null;
}

const formVacio = { titulo: "", contactoId: "", empresaId: "", productoId: "", etapaId: "", valorEstimado: "" };

export function OportunidadesPage() {
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [contactos, setContactos] = useState<Opcion[]>([]);
  const [empresas, setEmpresas] = useState<Opcion[]>([]);
  const [productos, setProductos] = useState<Opcion[]>([]);
  const [etapas, setEtapas] = useState<Opcion[]>([]);
  const [form, setForm] = useState(formVacio);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function cargar() {
    const [ops, cs, es, ps, et] = await Promise.all([
      api.get("/oportunidades"),
      api.get("/contactos"),
      api.get("/empresas"),
      api.get("/productos"),
      api.get("/etapas"),
    ]);
    setOportunidades(ops.data);
    setContactos(cs.data);
    setEmpresas(es.data);
    setProductos(ps.data);
    setEtapas(et.data);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.contactoId && !form.empresaId) {
      setError("Elegí un contacto o una empresa para la oportunidad");
      return;
    }
    try {
      await api.post("/oportunidades", {
        titulo: form.titulo,
        contactoId: form.contactoId ? Number(form.contactoId) : null,
        empresaId: form.empresaId ? Number(form.empresaId) : null,
        productoId: form.productoId ? Number(form.productoId) : null,
        etapaId: Number(form.etapaId),
        valorEstimado: form.valorEstimado ? Number(form.valorEstimado) : null,
      });
      setForm(formVacio);
      setMostrarForm(false);
      await cargar();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "No se pudo crear la oportunidad");
    }
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2>Oportunidades</h2>
        <button className="btn" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "+ Nueva oportunidad"}
        </button>
      </div>

      {mostrarForm && (
        <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
          {error && <div className="error-box">{error}</div>}
          <div className="form-grid">
            <label>
              Título *
              <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </label>
            <label>
              Etapa inicial *
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
              <input
                type="number"
                value={form.valorEstimado}
                onChange={(e) => setForm({ ...form, valorEstimado: e.target.value })}
              />
            </label>
          </div>
          <button className="btn" type="submit" style={{ marginTop: 12 }}>
            Guardar
          </button>
        </form>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Contacto / Empresa</th>
              <th>Plan</th>
              <th>Etapa</th>
              <th>Estado</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {oportunidades.map((o) => (
              <tr key={o.id}>
                <td>{o.titulo}</td>
                <td>
                  {o.contacto ? `${o.contacto.nombre} ${o.contacto.apellido}` : o.empresa?.razonSocial ?? "—"}
                </td>
                <td>{o.producto?.nombre ?? "—"}</td>
                <td>{o.etapa.nombre}</td>
                <td>{o.estado}</td>
                <td>{o.valorEstimado ? `$${o.valorEstimado}` : "—"}</td>
              </tr>
            ))}
            {oportunidades.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#888" }}>
                  Todavía no hay oportunidades cargadas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
