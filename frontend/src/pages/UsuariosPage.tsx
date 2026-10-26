import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { PencilIcon, SearchIcon } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROL_DESCRIPCION, ROL_LABEL, Rol } from "../constants/roles";

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  activo: boolean;
}

type UsuarioForm = Omit<Usuario, "id"> & { password: string };

const formVacio: UsuarioForm = {
  nombre: "",
  apellido: "",
  email: "",
  rol: "VENDEDOR",
  activo: true,
  password: "",
};

export function UsuariosPage() {
  const { usuario: actual } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [search, setSearch] = useState("");
  const [filtroRol, setFiltroRol] = useState<Rol | "">("");
  const [form, setForm] = useState<UsuarioForm>(formVacio);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);

  async function cargar(q?: string) {
    const res = await api.get<Usuario[]>("/usuarios", { params: { incluirInactivos: true, q } });
    setUsuarios(res.data);
  }

  useEffect(() => {
    const t = setTimeout(() => cargar(search || undefined), 250);
    return () => clearTimeout(t);
  }, [search]);

  function set<K extends keyof UsuarioForm>(campo: K, valor: UsuarioForm[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function abrirCreacion() {
    setForm(formVacio);
    setError(null);
    setMostrarForm(true);
  }

  function abrirEdicion(u: Usuario) {
    setForm({ nombre: u.nombre, apellido: u.apellido, email: u.email, rol: u.rol, activo: u.activo, password: "" });
    setError(null);
    setEditando(u);
  }

  function cerrarForm() {
    setEditando(null);
    setMostrarForm(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editando) {
        await api.put(`/usuarios/${editando.id}`, form);
      } else {
        const { activo: _activo, ...nuevo } = form;
        await api.post("/usuarios", nuevo);
      }
      cerrarForm();
      await cargar(search || undefined);
    } catch (err: any) {
      const detalles = err.response?.data?.detalles as Record<string, string[]> | undefined;
      const primerDetalle = detalles && Object.values(detalles).flat()[0];
      setError(primerDetalle ?? err.response?.data?.error ?? "No se pudo guardar el usuario");
    }
  }

  const formActivo = mostrarForm || editando !== null;
  // Rol y estado propios no se editan: el backend también lo rechaza.
  const esUnoMismo = editando !== null && editando.id === actual?.id;
  const visibles = filtroRol ? usuarios.filter((u) => u.rol === filtroRol) : usuarios;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h2>Usuarios</h2>
          <p>Quién trabaja en el CRM del gimnasio y qué puede hacer cada uno.</p>
        </div>
        <div className="toolbar">
          <div className="search-input">
            <SearchIcon />
            <input placeholder="Buscar por nombre o email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select
            className="filter-select"
            aria-label="Filtrar por rol"
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value as Rol | "")}
          >
            <option value="">Todos los roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROL_LABEL[r]}
              </option>
            ))}
          </select>
          <button className="btn" onClick={abrirCreacion}>
            + Nuevo usuario
          </button>
        </div>
      </div>

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((u) => (
              <tr key={u.id} className={u.activo ? undefined : "row-inactiva"} onClick={() => abrirEdicion(u)}>
                <td>
                  <div className="cell-user">
                    <Avatar nombre={u.nombre} apellido={u.apellido} />
                    <span className="cell-primary">
                      {u.nombre} {u.apellido}
                    </span>
                    {u.id === actual?.id && <span className="cell-muted">(vos)</span>}
                  </div>
                </td>
                <td className="cell-muted">{u.email}</td>
                <td>
                  <Badge value={u.rol} />
                </td>
                <td>
                  <Badge value={u.activo ? "ACTIVO" : "INACTIVO"} />
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirEdicion(u);
                      }}
                      aria-label="Editar"
                    >
                      <PencilIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr className="row-empty">
                <td colSpan={5} className="empty-state">
                  {search || filtroRol ? "Ningún usuario coincide con la búsqueda" : "Todavía no hay usuarios cargados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formActivo && (
        <Modal title={editando ? "Editar usuario" : "Nuevo usuario"} onClose={cerrarForm} width={640}>
          <form onSubmit={handleSubmit}>
            {error && <div className="error-box">{error}</div>}
            <div className="form-grid">
              <label>
                Nombre *
                <input required value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
              </label>
              <label>
                Apellido *
                <input required value={form.apellido} onChange={(e) => set("apellido", e.target.value)} />
              </label>
              <label>
                Email *
                <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
              </label>
              <label>
                {editando ? "Nueva contraseña" : "Contraseña *"}
                <input
                  type="password"
                  autoComplete="new-password"
                  required={!editando}
                  minLength={8}
                  placeholder={editando ? "Dejar vacía para no cambiarla" : "Al menos 8 caracteres"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
              </label>

              <fieldset className="rol-picker" disabled={esUnoMismo}>
                <legend>Rol{esUnoMismo ? " (no podés cambiar el tuyo)" : ""}</legend>
                {ROLES.map((r) => (
                  <label key={r} className="rol-opcion">
                    <input type="radio" name="rol" checked={form.rol === r} onChange={() => set("rol", r)} />
                    <strong>{ROL_LABEL[r]}</strong>
                    <small>{ROL_DESCRIPCION[r]}</small>
                  </label>
                ))}
              </fieldset>

              {editando && (
                <label className="span-2">
                  Estado{esUnoMismo ? " (no podés desactivar tu usuario)" : ""}
                  <select
                    disabled={esUnoMismo}
                    value={form.activo ? "ACTIVO" : "INACTIVO"}
                    onChange={(e) => set("activo", e.target.value === "ACTIVO")}
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo: no puede iniciar sesión</option>
                  </select>
                </label>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={cerrarForm}>
                Cancelar
              </button>
              <button type="submit" className="btn">
                {editando ? "Guardar cambios" : "Crear usuario"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
