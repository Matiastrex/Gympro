import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FunnelIcon, DealIcon, PersonIcon, BuildingIcon, LogoutIcon } from "./icons";

const links = [
  { to: "/", label: "Embudo", icon: FunnelIcon, end: true },
  { to: "/oportunidades", label: "Oportunidades", icon: DealIcon, end: false },
  { to: "/contactos", label: "Contactos", icon: PersonIcon, end: false },
  { to: "/empresas", label: "Empresas", icon: BuildingIcon, end: false },
];

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">GP</div>
      <nav className="sidebar-nav">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <Icon />
            <span className="tooltip">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button type="button" className="sidebar-link" onClick={handleLogout} aria-label="Cerrar sesión">
          <LogoutIcon />
          <span className="tooltip">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
