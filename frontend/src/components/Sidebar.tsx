import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Rol } from "../constants/roles";
import { FunnelIcon, DealIcon, PersonIcon, BuildingIcon, UsersIcon, LogoutIcon, ActividadIcon, DashboardIcon, EngranajeIcon } from "./icons";

interface SidebarLink {
  to: string;
  label: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  end: boolean;
  // Sin roles: lo ve cualquier usuario logueado.
  roles?: readonly Rol[];
}

const links: SidebarLink[] = [
  { to: "/", label: "Dashboard", icon: DashboardIcon, end: true },
  { to: "/embudo", label: "Embudo", icon: FunnelIcon, end: false },
  { to: "/oportunidades", label: "Oportunidades", icon: DealIcon, end: false },
  { to: "/contactos", label: "Contactos", icon: PersonIcon, end: false },
  { to: "/empresas", label: "Empresas", icon: BuildingIcon, end: false },
  { to: "/actividades", label: "Actividades", icon: ActividadIcon, end: false },
  { to: "/usuarios", label: "Usuarios", icon: UsersIcon, end: false, roles: ["ADMINISTRADOR"] },
  { to: "/configuracion", label: "Configuración", icon: EngranajeIcon, end: false, roles: ["ADMINISTRADOR"] },
];

export function Sidebar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const visibles = links.filter((link) => !link.roles || (usuario && link.roles.includes(usuario.rol)));

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">GP</div>
      <nav className="sidebar-nav">
        {visibles.map(({ to, label, icon: Icon, end }) => (
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
