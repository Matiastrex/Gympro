import { SVGProps } from "react";
import {
  ChatIcon,
  DoorIcon,
  DumbbellIcon,
  MailIcon,
  NotaIcon,
  PhoneIcon,
  PropuestaIcon,
  PuntoIcon,
  VideoIcon,
} from "./icons";

type Icono = (props: SVGProps<SVGSVGElement>) => JSX.Element;

// Los tipos son configurables desde el admin, así que el ícono se elige por
// palabras clave del nombre; uno que no matchee cae en el genérico.
const POR_PALABRA: readonly (readonly [RegExp, Icono])[] = [
  [/llamad|tel[eé]fon/i, PhoneIcon],
  [/correo|mail/i, MailIcon],
  [/mensaje|whats|chat|sms/i, ChatIcon],
  [/visita|presencial|recepci/i, DoorIcon],
  [/virtual|video|zoom|meet/i, VideoIcon],
  [/clase|prueba|entren|demostr/i, DumbbellIcon],
  [/propuesta|presupuesto/i, PropuestaIcon],
  [/nota/i, NotaIcon],
];

export function iconoDeTipo(nombre: string): Icono {
  return POR_PALABRA.find(([patron]) => patron.test(nombre))?.[1] ?? PuntoIcon;
}

export function TipoActividadIcon({ nombre, ...props }: { nombre: string } & SVGProps<SVGSVGElement>) {
  const Icon = iconoDeTipo(nombre);
  return <Icon aria-hidden="true" {...props} />;
}
