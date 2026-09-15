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
      <form className="card login-card" onSubmit={handleSubmit}>
        <h2 style={{ marginTop: 0 }}>GymPro CRM</h2>
        {error && <div className="error-box">{error}</div>}
        <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
          Contraseña
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
