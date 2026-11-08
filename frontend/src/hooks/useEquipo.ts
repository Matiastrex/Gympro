import { useEffect, useState } from "react";
import { api } from "../api/client";

export type UsuarioOpcion = { id: number; nombre: string; apellido: string };

// Usuarios activos para el filtro "Responsable". Solo se piden si el rol ve al equipo.
export function useEquipo(habilitado: boolean) {
  const [usuarios, setUsuarios] = useState<UsuarioOpcion[]>([]);
  useEffect(() => {
    if (!habilitado) return;
    let vigente = true;
    api.get<UsuarioOpcion[]>("/usuarios").then((res) => vigente && setUsuarios(res.data)).catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [habilitado]);
  return usuarios;
}
