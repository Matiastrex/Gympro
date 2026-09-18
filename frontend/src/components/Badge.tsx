import { ReactNode } from "react";

const VARIANT_BY_VALUE: Record<string, string> = {
  POTENCIAL: "badge-info",
  CLIENTE: "badge-success",
  INACTIVO: "badge-neutral",
  NO_CONTACTAR: "badge-danger",
  ABIERTA: "badge-info",
  GANADA: "badge-success",
  PERDIDA: "badge-danger",
};

export const ESTADO_LABEL: Record<string, string> = {
  POTENCIAL: "Potencial",
  CLIENTE: "Cliente",
  INACTIVO: "Inactivo",
  NO_CONTACTAR: "No contactar",
  ABIERTA: "Abierta",
  GANADA: "Ganada",
  PERDIDA: "Perdida",
};

interface BadgeProps {
  value: string;
  children?: ReactNode;
}

export function Badge({ value, children }: BadgeProps) {
  const variant = VARIANT_BY_VALUE[value] ?? "badge-neutral";
  return <span className={`badge ${variant}`}>{children ?? ESTADO_LABEL[value] ?? value}</span>;
}
