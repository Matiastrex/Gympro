import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function FunnelIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h16l-6 7.5V19l-4 2v-8.5L4 5Z" />
    </svg>
  );
}

export function DealIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="7" width="17" height="12" rx="2" />
      <path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7" />
      <path d="M3.5 12.5h17" />
    </svg>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" />
    </svg>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="3.5" width="10" height="17" rx="1" />
      <rect x="14.5" y="9.5" width="5" height="11" rx="1" />
      <path d="M7.5 7h1M11 7h1M7.5 10.5h1M11 10.5h1M7.5 14h1M11 14h1" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M16 16l4-4-4-4" />
      <path d="M20 12H9" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 19.5c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
      <path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4" />
      <path d="M17.5 14.3c2.1.6 3.6 2.4 4 5.2" />
    </svg>
  );
}

export function BajaIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M6.5 17.5l11-11" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

// ---------- Actividades ----------

export function ActividadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="M8.5 11.5l2 2 4-4" />
      <path d="M8.5 17h7" />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 3.5h2.8l1.4 4-2 1.3a10 10 0 0 0 6.5 6.5l1.3-2 4 1.4v2.8a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 19.5l1.2-3.6A7.5 7.5 0 1 1 8.4 18.6L4.5 19.5Z" />
      <path d="M9 11.5h.01M12 11.5h.01M15 11.5h.01" />
    </svg>
  );
}

export function DoorIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 20.5V4.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16" />
      <path d="M3.5 20.5h17" />
      <path d="M14.5 12.5h.01" />
    </svg>
  );
}

export function VideoIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="6.5" width="12" height="11" rx="2" />
      <path d="m15.5 10.5 5-3v9l-5-3" />
    </svg>
  );
}

export function DumbbellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 12h8" />
      <rect x="4.5" y="7.5" width="3.5" height="9" rx="1" />
      <rect x="16" y="7.5" width="3.5" height="9" rx="1" />
      <path d="M2.5 10v4M21.5 10v4" />
    </svg>
  );
}

export function PropuestaIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 3.5h7l4 4v13h-11Z" />
      <path d="M13.5 3.5v4h4" />
      <path d="M9 12.5h6M9 16h4" />
    </svg>
  );
}

export function NotaIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 4.5h15v10l-5 5h-10Z" />
      <path d="M14.5 19.5v-5h5" />
      <path d="M8 9h8" />
    </svg>
  );
}

export function PuntoIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
