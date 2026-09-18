import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";

const TITLES: Record<string, string> = {
  "/": "Embudo comercial",
  "/oportunidades": "Oportunidades",
  "/contactos": "Contactos",
  "/empresas": "Empresas",
};

const ROL_LABEL: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  VENDEDOR: "Vendedor",
  RESPONSABLE_COMERCIAL: "Responsable comercial",
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
            <span>{ROL_LABEL[usuario.rol] ?? usuario.rol}</span>
          </div>
          <Avatar nombre={usuario.nombre} apellido={usuario.apellido} size={36} />
        </div>
      )}
    </header>
  );
}
