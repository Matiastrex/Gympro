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

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
