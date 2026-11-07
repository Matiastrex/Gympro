// Espejo de las respuestas de /api/actividades (backend/src/modules/actividades).

/** Exactamente una de las claves de T presente; las demás quedan prohibidas. */
export type ExactlyOne<T> = {
  [K in keyof T]: Pick<T, K> & { [O in Exclude<keyof T, K>]?: never };
}[keyof T];

/** Un historial (y una actividad abierta desde un detalle) es siempre de UNA entidad. */
export type RefEntidad = ExactlyOne<{ contactoId: number; empresaId: number; oportunidadId: number }>;

export type TipoEntidad = "contacto" | "empresa" | "oportunidad";

export interface Paginado<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TipoActividad {
  id: number;
  nombre: string;
}

interface UsuarioResumen {
  id: number;
  nombre: string;
  apellido: string;
}

export interface Actividad {
  id: number;
  fecha: string;
  descripcion: string;
  resultado: string | null;
  tipoActividad: TipoActividad;
  usuario: UsuarioResumen;
  contacto: { id: number; nombre: string; apellido: string } | null;
  empresa: { id: number; razonSocial: string } | null;
  oportunidad: { id: number; titulo: string } | null;
}

export type TipoEtapa = "ABIERTA" | "GANADA" | "PERDIDA" | "BAJA";

interface EtapaResumen {
  id: number;
  nombre: string;
  tipo: TipoEtapa;
}

export interface CambioEtapa {
  id: number;
  fecha: string;
  observacion: string | null;
  etapaAnterior: EtapaResumen | null;
  etapaNueva: EtapaResumen;
  usuario: UsuarioResumen;
  oportunidad: { id: number; titulo: string };
}

export type HistorialItem =
  | { kind: "actividad"; fecha: string; actividad: Actividad }
  | { kind: "etapa"; fecha: string; cambio: CambioEtapa };

export type KindHistorial = HistorialItem["kind"];

// Cierra un `switch` sobre una unión discriminada: si falta un caso, no compila.
export function assertNever(valor: never): never {
  throw new Error(`Caso no contemplado: ${JSON.stringify(valor)}`);
}

// Clave y valor de una RefEntidad, para armar query params o etiquetas.
export function entidadDe(ref: RefEntidad): { tipo: TipoEntidad; id: number } {
  if (ref.contactoId != null) return { tipo: "contacto", id: ref.contactoId };
  if (ref.empresaId != null) return { tipo: "empresa", id: ref.empresaId };
  return { tipo: "oportunidad", id: ref.oportunidadId };
}

export function nombreUsuario(u: UsuarioResumen) {
  return `${u.nombre} ${u.apellido}`;
}

export function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

export function refDe(tipo: TipoEntidad, id: number): RefEntidad {
  switch (tipo) {
    case "contacto":
      return { contactoId: id };
    case "empresa":
      return { empresaId: id };
    case "oportunidad":
      return { oportunidadId: id };
    default:
      return assertNever(tipo);
  }
}

/** Mensaje legible de un error de la API (ApiError o validación Zod). */
export function mensajeDeError(err: unknown, porDefecto: string): string {
  const data = (err as { response?: { data?: { error?: string; detalles?: Record<string, string[] | undefined> } } })
    .response?.data;
  const detalle = data?.detalles && Object.values(data.detalles).flat().find(Boolean);
  return detalle ?? data?.error ?? porDefecto;
}
