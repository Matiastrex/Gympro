import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <div>
        <strong style={{ marginRight: 20 }}>GymPro CRM</strong>
        <Link to="/">Embudo</Link>
        <Link to="/oportunidades">Oportunidades</Link>
        <Link to="/contactos">Contactos</Link>
        <Link to="/empresas">Empresas</Link>
      </div>
      <div>
        {usuario && <span style={{ marginRight: 16, fontSize: 14 }}>{usuario.nombre} ({usuario.rol})</span>}
        <button className="btn secondary" onClick={handleLogout}>Salir</button>
      </div>
    </nav>
  );
}
