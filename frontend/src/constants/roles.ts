// Espejo del enum Rol de backend/prisma/schema.prisma.
export const ROLES = ["ADMINISTRADOR", "RESPONSABLE_COMERCIAL", "VENDEDOR"] as const;

export type Rol = (typeof ROLES)[number];

export const ROL_LABEL = {
  ADMINISTRADOR: "Administrador",
  RESPONSABLE_COMERCIAL: "Responsable comercial",
  VENDEDOR: "Vendedor",
} as const satisfies Record<Rol, string>;

export const ROL_DESCRIPCION = {
  ADMINISTRADOR: "Gestiona usuarios y la configuración del CRM. Ve toda la información.",
  RESPONSABLE_COMERCIAL: "Supervisa el embudo de todo el equipo y reasigna oportunidades.",
  VENDEDOR: "Atiende sus propios socios y consultas, y mueve sus oportunidades.",
} as const satisfies Record<Rol, string>;

// Espejo de backend/src/utils/permisos.ts: estos roles ven la cartera de todo
// el equipo y pueden asignar/reasignar responsables. El vendedor solo ve lo suyo.
export const ROLES_CON_VISION_TOTAL = ["ADMINISTRADOR", "RESPONSABLE_COMERCIAL"] as const satisfies readonly Rol[];

export function veTodo(rol: Rol | undefined): boolean {
  return rol !== undefined && (ROLES_CON_VISION_TOTAL as readonly Rol[]).includes(rol);
}
