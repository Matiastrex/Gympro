import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { veTodo } from "../constants/roles";

interface UsuarioOpcion {
  id: number;
  nombre: string;
  apellido: string;
}

interface ResponsableSelectProps {
  // Id como string, igual que el resto de los selects de los formularios ("" = sin asignar).
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Campo "Responsable" compartido por empresas, contactos y oportunidades.
// Admin y responsable comercial eligen a cualquier usuario activo; para un
// vendedor queda fijo en él mismo (el backend aplica la misma regla).
export function ResponsableSelect({ value, onChange, className }: ResponsableSelectProps) {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioOpcion[]>([]);
  const puedeAsignar = veTodo(usuario?.rol);

  useEffect(() => {
    if (puedeAsignar) api.get<UsuarioOpcion[]>("/usuarios").then((res) => setUsuarios(res.data));
  }, [puedeAsignar]);

  // El vendedor no elige: lo nuevo y lo que edita queda a su nombre.
  useEffect(() => {
    if (!puedeAsignar && usuario && value !== String(usuario.id)) onChange(String(usuario.id));
  }, [puedeAsignar, usuario, value, onChange]);

  if (!puedeAsignar) {
    return (
      <label className={className}>
        Responsable
        <select disabled value={usuario ? String(usuario.id) : ""}>
          <option value={usuario?.id}>
            {usuario?.nombre} {usuario?.apellido} (vos)
          </option>
        </select>
      </label>
    );
  }

  return (
    <label className={className}>
      Responsable
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sin asignar</option>
        {usuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nombre} {u.apellido}
            {u.id === usuario?.id ? " (vos)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
