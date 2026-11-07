// Espejo de /api/notificaciones, /api/reaperturas y /api/dashboard.
import type { Paginado } from "./actividades";

export type EstadoSolicitud = "PENDIENTE" | "APROBADA" | "RECHAZADA";

interface UsuarioResumen {
  id: number;
  nombre: string;
  apellido: string;
}

export interface SolicitudReapertura {
  id: number;
  oportunidadId: number;
  motivo: string;
  estado: EstadoSolicitud;
  createdAt: string;
  resueltaEn: string | null;
  comentarioResolucion: string | null;
  etapaDestino: { id: number; nombre: string };
  solicitante: UsuarioResumen;
  resueltaPor: UsuarioResumen | null;
}

interface NotificacionBase {
  id: number;
  mensaje: string;
  leida: boolean;
  createdAt: string;
  oportunidad: { id: number; titulo: string; estado: string } | null;
}

/** Discriminada por `tipo`: cada variante sabe qué trae su `solicitud`. */
export type Notificacion =
  | (NotificacionBase & { tipo: "REAPERTURA_SOLICITADA"; solicitud: SolicitudReapertura })
  | (NotificacionBase & { tipo: "REAPERTURA_APROBADA"; solicitud: SolicitudReapertura })
  | (NotificacionBase & { tipo: "REAPERTURA_RECHAZADA"; solicitud: SolicitudReapertura });

export type TipoNotificacion = Notificacion["tipo"];

export type PaginaNotificaciones = Paginado<Notificacion>;

// ---------- Dashboard ----------

export type RolFiltrable = "VENDEDOR" | "RESPONSABLE_COMERCIAL";

export type Alcance =
  | { tipo: "equipo" }
  | { tipo: "rol"; rol: RolFiltrable }
  | { tipo: "usuario"; usuarioId: number };

export interface Dashboard {
  alcance: Alcance;
  rango: { desde: string; hasta: string };
  kpis: {
    abiertas: number;
    valorAbierto: number;
    inscriptos: number;
    perdidas: number;
    conversion: number | null;
    valorGanado: number;
    actividades: number;
    reaperturasPendientes: number | null;
  };
  embudo: { etapaId: number; etapa: string; cantidad: number }[];
  motivosPerdida: { motivo: string; cantidad: number }[];
  actividadesPorTipo: { tipo: string; cantidad: number }[];
  evolucion: { mes: string; inscriptos: number; perdidas: number }[];
}
