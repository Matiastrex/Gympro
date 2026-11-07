import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROL_LABEL, Rol } from "../constants/roles";
import type { Dashboard, RolFiltrable } from "../types/notificaciones";

// Colores de los gráficos (validados con el validador de paletas de dataviz:
// CVD ΔE 28.7 y contraste ≥ 3:1 sobre la superficie blanca).
const SERIE = {
  inscriptos: "#2f6fed", // --info
  perdidas: "#ff5a36", // --brand
  unica: "#ff5a36",
} as const;
const TINTA = { secundaria: "#5b5d6b", tenue: "#9496a3", linea: "#efeee8" } as const;

type Periodo = "mes" | "3m" | "6m" | "anio";

const PERIODOS: readonly { valor: Periodo; label: string }[] = [
  { valor: "mes", label: "Este mes" },
  { valor: "3m", label: "3 meses" },
  { valor: "6m", label: "6 meses" },
  { valor: "anio", label: "Este año" },
];

function desdeDe(periodo: Periodo): Date {
  const hoy = new Date();
  const mesesAtras = { mes: 0, "3m": 2, "6m": 5, anio: hoy.getMonth() }[periodo];
  return new Date(hoy.getFullYear(), hoy.getMonth() - mesesAtras, 1);
}

/** Filtro del admin: "equipo", "rol:VENDEDOR" o "usuario:3". */
type FiltroAdmin = "equipo" | `rol:${RolFiltrable}` | `usuario:${number}`;

function aParams(filtro: FiltroAdmin) {
  if (filtro === "equipo") return {};
  const [tipo, valor] = filtro.split(":");
  return tipo === "rol" ? { rol: valor } : { usuarioId: valor };
}

interface UsuarioOpcion {
  id: number;
  nombre: string;
  apellido: string;
  rol: Rol;
}

const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const porcentaje = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 0 });

function etiquetaMes(clave: string) {
  const [anio, mes] = clave.split("-").map(Number);
  return new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
}

export function DashboardPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "ADMINISTRADOR";
  const [periodo, setPeriodo] = useState<Periodo>("6m");
  const [filtro, setFiltro] = useState<FiltroAdmin>("equipo");
  const [usuarios, setUsuarios] = useState<UsuarioOpcion[]>([]);
  const [datos, setDatos] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!esAdmin) return;
    api.get<UsuarioOpcion[]>("/usuarios").then((res) => setUsuarios(res.data.filter((u) => u.rol !== "ADMINISTRADOR")));
  }, [esAdmin]);

  useEffect(() => {
    let vigente = true;
    api
      .get<Dashboard>("/dashboard", {
        params: { desde: desdeDe(periodo).toISOString(), ...(esAdmin ? aParams(filtro) : {}) },
      })
      .then((res) => {
        if (!vigente) return;
        setDatos(res.data);
        setError(null);
      })
      .catch(() => vigente && setError("No se pudieron cargar las métricas"));
    return () => {
      vigente = false;
    };
  }, [periodo, filtro, esAdmin]);

  const subtitulo = useMemo(() => {
    if (!esAdmin) return "Tus oportunidades y lo que registraste.";
    if (filtro === "equipo") return "Todo el equipo comercial.";
    if (filtro === "rol:VENDEDOR") return "Solo los vendedores.";
    if (filtro === "rol:RESPONSABLE_COMERCIAL") return "Solo los responsables comerciales.";
    const u = usuarios.find((x) => `usuario:${x.id}` === filtro);
    return u ? `Cartera de ${u.nombre} ${u.apellido}.` : "";
  }, [esAdmin, filtro, usuarios]);

  const k = datos?.kpis;
  const cerradas = k ? k.inscriptos + k.perdidas : 0;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h2>Hola, {usuario?.nombre}</h2>
          <p>{subtitulo}</p>
        </div>
        <div className="toolbar">
          {esAdmin && (
            <select
              className="filter-select"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as FiltroAdmin)}
              aria-label="De quién son las métricas"
            >
              <option value="equipo">Todo el equipo</option>
              <option value="rol:VENDEDOR">Vendedores</option>
              <option value="rol:RESPONSABLE_COMERCIAL">Responsables comerciales</option>
              <optgroup label="Una persona">
                {usuarios.map((u) => (
                  <option key={u.id} value={`usuario:${u.id}`}>
                    {u.nombre} {u.apellido} ({ROL_LABEL[u.rol].toLowerCase()})
                  </option>
                ))}
              </optgroup>
            </select>
          )}
          <div className="segmented segmented-flat" role="group" aria-label="Período">
            {PERIODOS.map((p) => (
              <button key={p.valor} type="button" aria-pressed={periodo === p.valor} onClick={() => setPeriodo(p.valor)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {esAdmin && k?.reaperturasPendientes ? (
        <Link to="/notificaciones" className="dash-alerta">
          <strong>
            {k.reaperturasPendientes === 1
              ? "1 pedido de reapertura espera tu aprobación"
              : `${k.reaperturasPendientes} pedidos de reapertura esperan tu aprobación`}
          </strong>
          <span>Revisar en Notificaciones</span>
        </Link>
      ) : null}

      {k && (
        <section className="kpi-grid" aria-label="Resumen">
          <Kpi label="Oportunidades abiertas" valor={k.abiertas} detalle={k.valorAbierto ? `${pesos.format(k.valorAbierto)} en juego` : "Hoy, sin importar el período"} />
          <Kpi label="Inscriptos" valor={k.inscriptos} detalle={k.valorGanado ? `${pesos.format(k.valorGanado)} en membresías` : "Ganadas en el período"} />
          <Kpi label="Perdidas" valor={k.perdidas} detalle="En el período" />
          <Kpi
            label="Conversión"
            valor={k.conversion === null ? "—" : porcentaje.format(k.conversion)}
            detalle={cerradas ? `${k.inscriptos} de ${cerradas} cerradas` : "Sin cierres en el período"}
            meter={k.conversion}
          />
          <Kpi label="Actividades" valor={k.actividades} detalle="Llamadas, mensajes y visitas" />
        </section>
      )}

      {datos && (
        <div className="dash-grid">
          <Panel titulo="Embudo abierto" ayuda="Oportunidades abiertas hoy en cada etapa.">
            {datos.embudo.some((e) => e.cantidad > 0) ? (
              <BarrasHorizontales datos={datos.embudo.map((e) => ({ nombre: e.etapa, cantidad: e.cantidad }))} unidad="oportunidades" />
            ) : (
              <Vacio texto="No hay oportunidades abiertas. Cargá una consulta nueva para empezar el embudo." />
            )}
          </Panel>

          <Panel titulo="Inscriptos y perdidas por mes" ayuda="Según la fecha de cierre.">
            {datos.evolucion.some((m) => m.inscriptos + m.perdidas > 0) ? (
              <Evolucion datos={datos.evolucion} />
            ) : (
              <Vacio texto="No se cerró ninguna oportunidad en este período." />
            )}
          </Panel>

          <Panel titulo="Por qué se pierden" ayuda="Motivos de pérdida en el período.">
            {datos.motivosPerdida.length ? (
              <BarrasHorizontales datos={datos.motivosPerdida.map((m) => ({ nombre: m.motivo, cantidad: m.cantidad }))} unidad="perdidas" />
            ) : (
              <Vacio texto="No hubo pérdidas en este período." />
            )}
          </Panel>

          <Panel titulo="Actividades por tipo" ayuda="Registradas en el período.">
            {datos.actividadesPorTipo.length ? (
              <BarrasHorizontales datos={datos.actividadesPorTipo.map((a) => ({ nombre: a.tipo, cantidad: a.cantidad }))} unidad="actividades" />
            ) : (
              <Vacio texto="No hay actividades registradas en este período. Anotá llamadas y visitas desde el detalle de cada socio." />
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, valor, detalle, meter }: { label: string; valor: number | string; detalle: string; meter?: number | null }) {
  return (
    <div className="card kpi">
      <span className="kpi-label">{label}</span>
      <strong className="kpi-valor">{valor}</strong>
      {meter != null && (
        <span className="kpi-meter" aria-hidden="true">
          <span style={{ width: `${Math.round(meter * 100)}%` }} />
        </span>
      )}
      <span className="kpi-detalle">{detalle}</span>
    </div>
  );
}

function Panel({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: ReactNode }) {
  return (
    <section className="card dash-panel">
      <header>
        <h3>{titulo}</h3>
        <p>{ayuda}</p>
      </header>
      {children}
    </section>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="dash-vacio">{texto}</p>;
}

const ejeTexto = { fontSize: 12, fill: TINTA.secundaria };

function TooltipCantidad({ active, payload, label, unidad }: { active?: boolean; payload?: { value: number }[]; label?: string; unidad: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>
        {payload[0].value} {unidad}
      </span>
    </div>
  );
}

// Ranking de una sola serie: barras horizontales finas, valor al final de cada una.
function BarrasHorizontales({ datos, unidad }: { datos: { nombre: string; cantidad: number }[]; unidad: string }) {
  const alto = Math.max(72, datos.length * 34 + 12);
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }} barCategoryGap={10}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="nombre" width={170} tick={ejeTexto} tickLine={false} axisLine={false} interval={0} />
        <Tooltip cursor={{ fill: "rgba(22, 23, 28, 0.04)" }} content={<TooltipCantidad unidad={unidad} />} />
        <Bar dataKey="cantidad" fill={SERIE.unica} barSize={14} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          <LabelList dataKey="cantidad" position="right" style={{ fontSize: 12, fill: TINTA.secundaria, fontVariantNumeric: "tabular-nums" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TooltipEvolucion({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((p) => (
        <span key={p.name} className="chart-tooltip-fila">
          <i style={{ background: p.color }} aria-hidden="true" />
          {p.name}: {p.value}
        </span>
      ))}
    </div>
  );
}

// Dos series en el tiempo, una sola escala.
function Evolucion({ datos }: { datos: Dashboard["evolucion"] }) {
  const filas = datos.map((d) => ({ ...d, etiqueta: etiquetaMes(d.mes) }));
  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={filas} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke={TINTA.linea} />
        <XAxis dataKey="etiqueta" tick={ejeTexto} tickLine={false} axisLine={{ stroke: TINTA.linea }} />
        <YAxis allowDecimals={false} tick={ejeTexto} tickLine={false} axisLine={false} />
        <Tooltip content={<TooltipEvolucion />} cursor={{ stroke: TINTA.tenue, strokeDasharray: "3 3" }} />
        <Legend verticalAlign="top" align="left" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: TINTA.secundaria }} />
        <Line name="Inscriptos" dataKey="inscriptos" stroke={SERIE.inscriptos} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} isAnimationActive={false} />
        <Line name="Perdidas" dataKey="perdidas" stroke={SERIE.perdidas} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
