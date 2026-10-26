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
