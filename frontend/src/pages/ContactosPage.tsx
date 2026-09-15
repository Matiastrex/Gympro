import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

interface Empresa {
  id: number;
  razonSocial: string;
}

interface Contacto {
  id: number;
  nombre: string;
  apellido: string;
  email?: string;
  telefono?: string;
  estado: string;
  empresa?: { razonSocial: string } | null;
}

const contactoVacio = { nombre: "", apellido: "", email: "", telefono: "", empresaId: "" };

export function ContactosPage() {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [form, setForm] = useState(contactoVacio);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function cargar() {
    const [resContactos, resEmpresas] = await Promise.all([api.get("/contactos"), api.get("/empresas")]);
    setContactos(resContactos.data);
    setEmpresas(resEmpresas.data);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/contactos", {
        ...form,
        empresaId: form.empresaId ? Number(form.empresaId) : null,
      });
      setForm(contactoVacio);
      setMostrarForm(false);
      await cargar();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "No se pudo crear el contacto");
    }
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2>Contactos</h2>
        <button className="btn" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "+ Nuevo contacto"}
        </button>
      </div>

      {mostrarForm && (
        <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
          {error && <div className="error-box">{error}</div>}
          <div className="form-grid">
            <label>
              Nombre *
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </label>
            <label>
              Apellido *
              <input
                required
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              />
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
              Empresa (opcional — solo si es un convenio corporativo)
              <select value={form.empresaId} onChange={(e) => setForm({ ...form, empresaId: e.target.value })}>
                <option value="">Cliente individual</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.razonSocial}
                  </option>
                ))}
              </select>
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
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Empresa</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {contactos.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.nombre} {c.apellido}
                </td>
                <td>{c.email}</td>
                <td>{c.telefono}</td>
                <td>{c.empresa?.razonSocial ?? "—"}</td>
                <td>{c.estado}</td>
              </tr>
            ))}
            {contactos.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "#888" }}>
                  Todavía no hay contactos cargados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
