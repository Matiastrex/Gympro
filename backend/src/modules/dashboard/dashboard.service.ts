import { z } from "zod";
import { Prisma } from "@prisma/client";
import { Actor } from "../../utils/permisos";
import * as dashboardRepo from "./dashboard.repository";

export const filtrosSchema = z.object({
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  usuarioId: z.coerce.number().int().positive().optional(),
  rol: z.enum(["VENDEDOR", "RESPONSABLE_COMERCIAL"]).optional(),
});

export type FiltrosDashboard = z.infer<typeof filtrosSchema>;

/** De quién son las métricas. */
export type Alcance =
  | { tipo: "equipo" }
  | { tipo: "rol"; rol: NonNullable<FiltrosDashboard["rol"]> }
  | { tipo: "usuario"; usuarioId: number };

// Vendedor y responsable comercial: siempre lo propio (se ignoran los filtros).
// Administrador: todo el equipo, un rol o un usuario puntual.
export function resolverAlcance(filtros: FiltrosDashboard, actor: Actor): Alcance {
  if (actor.rol !== "ADMINISTRADOR") return { tipo: "usuario", usuarioId: actor.userId };
  if (filtros.usuarioId) return { tipo: "usuario", usuarioId: filtros.usuarioId };
  if (filtros.rol) return { tipo: "rol", rol: filtros.rol };
  return { tipo: "equipo" };
}

// Las oportunidades cuentan para su responsable; las actividades, para quien las registró.
function wheres(alcance: Alcance): { oportunidad: Prisma.OportunidadWhereInput; actividad: Prisma.ActividadWhereInput } {
  switch (alcance.tipo) {
    case "equipo":
      return { oportunidad: {}, actividad: {} };
    case "rol":
      return { oportunidad: { responsable: { rol: alcance.rol } }, actividad: { usuario: { rol: alcance.rol } } };
    case "usuario":
      return { oportunidad: { responsableId: alcance.usuarioId }, actividad: { usuarioId: alcance.usuarioId } };
  }
}

// Por defecto: los últimos 6 meses completos hasta hoy.
function rangoPorDefecto(): dashboardRepo.Rango {
  const hasta = new Date();
  const desde = new Date(hasta.getFullYear(), hasta.getMonth() - 5, 1);
  return { desde, hasta };
}

const claveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

function mesesEntre({ desde, hasta }: dashboardRepo.Rango, maximo = 24): string[] {
  const meses: string[] = [];
  const cursor = new Date(desde.getFullYear(), desde.getMonth(), 1);
  while (cursor <= hasta && meses.length < maximo) {
    meses.push(claveMes(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return meses;
}

const MAX_MOTIVOS = 6;

export interface Dashboard {
  alcance: Alcance;
  rango: dashboardRepo.Rango;
  kpis: {
    abiertas: number;
    valorAbierto: number;
    inscriptos: number;
    perdidas: number;
    /** inscriptos / (inscriptos + perdidas) en el período; null si no se cerró ninguna. */
    conversion: number | null;
    valorGanado: number;
    actividades: number;
    /** Solo para el administrador. */
    reaperturasPendientes: number | null;
  };
  embudo: { etapaId: number; etapa: string; cantidad: number }[];
  motivosPerdida: { motivo: string; cantidad: number }[];
  actividadesPorTipo: { tipo: string; cantidad: number }[];
  evolucion: { mes: string; inscriptos: number; perdidas: number }[];
}

export async function obtener(filtros: FiltrosDashboard, actor: Actor): Promise<Dashboard> {
  const alcance = resolverAlcance(filtros, actor);
  const where = wheres(alcance);
  const defecto = rangoPorDefecto();
  const rango = { desde: filtros.desde ?? defecto.desde, hasta: filtros.hasta ?? defecto.hasta };

  const [abiertas, cerradas, porEtapa, etapas, motivos, porTipo, tipos, pendientes, catalogoMotivos] = await Promise.all([
    dashboardRepo.contarAbiertas(where.oportunidad),
    dashboardRepo.cerradasEnRango(where.oportunidad, rango),
    dashboardRepo.abiertasPorEtapa(where.oportunidad),
    dashboardRepo.etapasAbiertas(),
    dashboardRepo.motivosPerdida(where.oportunidad, rango),
    dashboardRepo.actividadesPorTipo(where.actividad, rango),
    dashboardRepo.tiposActividad(),
    actor.rol === "ADMINISTRADOR" ? dashboardRepo.reaperturasPendientes() : Promise.resolve(null),
    dashboardRepo.motivosPerdidaCatalogo(),
  ]);

  const esInscripto = (estado: string) => estado === "GANADA" || estado === "BAJA";
  const inscriptos = cerradas.filter((o) => esInscripto(o.estado));
  const perdidas = cerradas.length - inscriptos.length;

  const evolucion = mesesEntre(rango).map((mes) => ({ mes, inscriptos: 0, perdidas: 0 }));
  const porMes = new Map(evolucion.map((fila) => [fila.mes, fila]));
  for (const o of cerradas) {
    const fila = o.fechaRealCierre && porMes.get(claveMes(o.fechaRealCierre));
    if (!fila) continue;
    if (esInscripto(o.estado)) fila.inscriptos++;
    else fila.perdidas++;
  }

  const nombreMotivo = new Map(catalogoMotivos.map((m) => [m.id, m.nombre]));
  const motivosOrdenados = motivos
    .map((m) => ({
      motivo: (m.motivoPerdidaId != null && nombreMotivo.get(m.motivoPerdidaId)) || "Sin motivo",
      cantidad: m._count._all,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);
  const otros = motivosOrdenados.slice(MAX_MOTIVOS).reduce((total, m) => total + m.cantidad, 0);

  const nombreTipo = new Map(tipos.map((t) => [t.id, t.nombre]));
  const cantidadPorEtapa = new Map(porEtapa.map((e) => [e.etapaId, e._count._all]));

  return {
    alcance,
    rango,
    kpis: {
      abiertas: abiertas._count._all,
      valorAbierto: Number(abiertas._sum.valorEstimado ?? 0),
      inscriptos: inscriptos.length,
      perdidas,
      conversion: cerradas.length ? inscriptos.length / cerradas.length : null,
      valorGanado: inscriptos.reduce((total, o) => total + Number(o.valorEstimado ?? 0), 0),
      actividades: porTipo.reduce((total, t) => total + t._count._all, 0),
      reaperturasPendientes: pendientes,
    },
    embudo: etapas.map((e) => ({ etapaId: e.id, etapa: e.nombre, cantidad: cantidadPorEtapa.get(e.id) ?? 0 })),
    motivosPerdida: [
      ...motivosOrdenados.slice(0, MAX_MOTIVOS),
      ...(otros > 0 ? [{ motivo: "Otros", cantidad: otros }] : []),
    ],
    actividadesPorTipo: porTipo
      .map((t) => ({ tipo: nombreTipo.get(t.tipoActividadId) ?? "Otro", cantidad: t._count._all }))
      .sort((a, b) => b.cantidad - a.cantidad),
    evolucion,
  };
}
