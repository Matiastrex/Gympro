import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { usuario, loading } = useAuth();

  if (loading) return <p style={{ padding: 24 }}>Cargando...</p>;
  if (!usuario) return <Navigate to="/login" replace />;

  return <Outlet />;
}
