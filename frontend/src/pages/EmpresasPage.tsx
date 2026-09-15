import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

interface Empresa {
  id: number;
  razonSocial: string;
  email?: string;
  telefono?: string;
  estado: string;
}

const empresaVacia = { razonSocial: "", email: "", telefono: "", industria: "" };

export function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [form, setForm] = useState(empresaVacia);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function cargar() {
    const res = await api.get("/empresas");
    setEmpresas(res.data);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/empresas", form);
      setForm(empresaVacia);
      setMostrarForm(false);
      await cargar();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "No se pudo crear la empresa");
    }
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2>Empresas</h2>
        <button className="btn" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "+ Nueva empresa"}
        </button>
      </div>

      {mostrarForm && (
        <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
          {error && <div className="error-box">{error}</div>}
          <div className="form-grid">
            <label>
              Razón social *
              <input
                required
                value={form.razonSocial}
                onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
              />
            </label>
            <label>
              Industria
              <input value={form.industria} onChange={(e) => setForm({ ...form, industria: e.target.value })} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              Teléfono
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
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
              <th>Razón social</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.razonSocial}</td>
                <td>{emp.email}</td>
                <td>{emp.telefono}</td>
                <td>{emp.estado}</td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "#888" }}>
                  Todavía no hay empresas cargadas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
