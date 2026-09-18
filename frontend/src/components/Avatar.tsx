const PALETTE = ["#ff5a36", "#2f6fed", "#1f9d55", "#8b5cf6", "#b26a00", "#e23d3d", "#0e8f8f"];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

interface AvatarProps {
  nombre?: string | null;
  apellido?: string | null;
  size?: number;
}

export function Avatar({ nombre, apellido, size = 30 }: AvatarProps) {
  const label = `${nombre ?? ""} ${apellido ?? ""}`.trim();
  const initials = `${nombre?.[0] ?? ""}${apellido?.[0] ?? ""}`.toUpperCase() || "?";
  const color = PALETTE[hash(label || "?") % PALETTE.length];

  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4, background: color }}>
      {initials}
    </span>
  );
}
