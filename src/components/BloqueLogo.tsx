import Image from "next/image";

export function BloqueLogo({
  nombre,
  color,
  logoSrc,
  size = 32,
}: {
  nombre: string;
  color: string;
  logoSrc?: string | null;
  size?: number;
}) {
  if (logoSrc) {
    return (
      <Image
        src={logoSrc}
        alt={`Logo ${nombre}`}
        width={size}
        height={size}
        className="rounded-md object-contain"
        unoptimized
      />
    );
  }

  return (
    <span
      className="inline-block shrink-0 rounded-md"
      style={{ backgroundColor: color, width: size, height: size }}
      title={nombre}
      aria-hidden
    />
  );
}
