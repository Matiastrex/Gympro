import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { ROL_LABEL } from "../constants/roles";

const TITLES: Record<string, string> = {
  "/": "Embudo comercial",
  "/oportunidades": "Oportunidades",
  "/contactos": "Contactos",
  "/empresas": "Empresas",
  "/actividades": "Actividades",
  "/usuarios": "Usuarios",
};

export function Topbar() {
  const { pathname } = useLocation();
  const { usuario } = useAuth();
  const title = TITLES[pathname] ?? "GymPro CRM";

  return (
    <header className="topbar">
      <h1>{title}</h1>
      {usuario && (
        <div className="topbar-user">
          <div className="topbar-user-info">
            <strong>
              {usuario.nombre} {usuario.apellido}
            </strong>
            <span>{ROL_LABEL[usuario.rol]}</span>
          </div>
          <Avatar nombre={usuario.nombre} apellido={usuario.apellido} size={36} />
        </div>
      )}
    </header>
  );
}
