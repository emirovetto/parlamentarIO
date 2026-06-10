import Image from "next/image";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-28 w-28 text-2xl",
} as const;

export function Avatar({
  src,
  nombre,
  apellido,
  size = "md",
  className = "",
}: {
  src?: string | null;
  nombre: string;
  apellido: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const initials = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  const dim = size === "sm" ? 32 : size === "md" ? 48 : size === "lg" ? 80 : 112;

  if (src) {
    return (
      <Image
        src={src}
        alt={`${nombre} ${apellido}`}
        width={dim}
        height={dim}
        className={`rounded-full object-cover ring-2 ring-white shadow ${SIZES[size]} ${className}`}
        unoptimized
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 ring-2 ring-white ${SIZES[size]} ${className}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}
