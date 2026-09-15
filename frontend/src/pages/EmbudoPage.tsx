import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Etapa {
  id: number;
  nombre: string;
  tipo: "ABIERTA" | "GANADA" | "PERDIDA";
}

interface Oportunidad {
  id: number;
  titulo: string;
  contacto?: { nombre: string; apellido: string } | null;
  empresa?: { razonSocial: string } | null;
}

interface Columna {
  etapa: Etapa;
  oportunidades: Oportunidad[];
}

export function EmbudoPage() {
  const [columnas, setColumnas] = useState<Columna[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const res = await api.get("/embudo");
    setColumnas(res.data);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function cambiarEtapa(oportunidadId: number, etapaNuevaId: number, etapaTipo: string) {
    setError(null);
    let motivoPerdida: string | undefined;
    if (etapaTipo === "PERDIDA") {
      motivoPerdida = window.prompt("Motivo de pérdida:") ?? undefined;
      if (!motivoPerdida) return;
    }
    try {
      await api.post(`/oportunidades/${oportunidadId}/cambiar-etapa`, { etapaNuevaId, motivoPerdida });
      await cargar();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "No se pudo cambiar de etapa");
    }
  }

  return (
    <div className="container">
      <h2>Embudo comercial</h2>
      {error && <div className="error-box">{error}</div>}
      <div className="board">
        {columnas.map(({ etapa, oportunidades }) => (
          <div className="board-column" key={etapa.id}>
            <h3>
              {etapa.nombre} ({oportunidades.length})
            </h3>
            {oportunidades.map((o) => (
              <div className="opp-card" key={o.id}>
                <strong>{o.titulo}</strong>
                <div style={{ color: "#666" }}>
                  {o.contacto ? `${o.contacto.nombre} ${o.contacto.apellido}` : o.empresa?.razonSocial ?? "—"}
                </div>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const [id, tipo] = e.target.value.split("|");
                    if (id) cambiarEtapa(o.id, Number(id), tipo);
                    e.target.value = "";
                  }}
                >
                  <option value="">Mover a...</option>
                  {columnas
                    .filter((c) => c.etapa.id !== etapa.id)
                    .map((c) => (
                      <option key={c.etapa.id} value={`${c.etapa.id}|${c.etapa.tipo}`}>
                        {c.etapa.nombre}
                      </option>
                    ))}
                </select>
              </div>
            ))}
            {oportunidades.length === 0 && <p style={{ color: "#aaa", fontSize: 12 }}>Sin oportunidades</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
