import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@gympro.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Email o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-shell">
        <form className="login-form-panel" onSubmit={handleSubmit}>
          <div className="login-brand">
            <div className="sidebar-logo">GP</div>
            <span>GymPro CRM</span>
          </div>

          <div className="login-heading">
            <h1>
              Bienvenido de nuevo.
              <br />
              Iniciá sesión para continuar.
            </h1>
            <p>Ingresá tus datos para acceder al panel de gestión</p>
          </div>

          {error && <div className="error-box">{error}</div>}

          <label className="login-field">
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoFocus
              placeholder="tu@gimnasio.com"
            />
          </label>
          <label className="login-field">
            <span>Contraseña</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              placeholder="••••••••"
            />
          </label>

          <button className="btn login-submit" type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="login-hint">Gestión comercial para gimnasios de barrio</p>
        </form>

        <div className="login-art-panel">
          <div className="login-art-glow" />
          <div className="login-art-card">
            <div className="login-art-card-row">
              <span className="login-art-avatar" />
              <span className="login-art-bars">
                <span />
                <span />
              </span>
            </div>
            <span className="login-art-bar-line" />
            <span className="login-art-bar-line short" />
            <span className="login-art-bar-line" />
          </div>
          <p className="login-art-tagline">Todo tu gimnasio, en un solo lugar.</p>
        </div>
      </div>
    </div>
  );
}
