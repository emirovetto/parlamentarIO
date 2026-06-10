import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { BloqueLogo } from "@/components/BloqueLogo";
import { imagenUrl } from "@/lib/imagenes";
import { fecha } from "@/lib/format";

type ConcejalCardData = {
  id: string;
  nombre: string;
  apellido: string;
  partido: string;
  email?: string | null;
  telefono?: string | null;
  mandatoInicio: Date;
  mandatoFin: Date;
  fotoUrl?: string | null;
  fotoId?: string | null;
  bloque: { nombre: string; color: string; logoId?: string | null };
};

export function ConcejalCard({ concejal }: { concejal: ConcejalCardData }) {
  const fotoSrc = imagenUrl(concejal.fotoId) ?? concejal.fotoUrl;
  const logoSrc = imagenUrl(concejal.bloque.logoId);

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="h-1.5" style={{ backgroundColor: concejal.bloque.color }} />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <Avatar src={fotoSrc} nombre={concejal.nombre} apellido={concejal.apellido} size="lg" />
          <div className="min-w-0 flex-1">
            <Link
              href={`/concejales/${concejal.id}`}
              className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 group-hover:underline"
            >
              {concejal.nombre} {concejal.apellido}
            </Link>
            <div className="mt-1 flex items-center gap-2">
              <BloqueLogo nombre={concejal.bloque.nombre} color={concejal.bloque.color} logoSrc={logoSrc} size={20} />
              <span className="text-sm text-slate-600">{concejal.bloque.nombre}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{concejal.partido}</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Mandato {fecha(concejal.mandatoInicio)} — {fecha(concejal.mandatoFin)}
        </p>
        {concejal.email ? (
          <p className="mt-2 truncate text-xs text-slate-500">{concejal.email}</p>
        ) : null}
      </div>
    </article>
  );
}
