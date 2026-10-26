import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Rol } from "../constants/roles";

interface ProtectedRouteProps {
  // Sin roles: alcanza con estar logueado. Con roles: el resto vuelve al embudo.
  roles?: readonly Rol[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { usuario, loading } = useAuth();

  if (loading) return <p style={{ padding: 24 }}>Cargando...</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />;

  return <Outlet />;
}
