import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getConfiguracionSitio } from "@/lib/configuracion";
import { TIPO_SESION, ESTADO_SESION } from "@/lib/format";
import type { TipoSesion, EstadoSesion } from "@/generated/prisma/client";
import { PantallaEscalador } from "@/components/PantallaEscalador";

export const dynamic = "force-dynamic";

/** Pantalla de espera cuando la sesión no está EN_CURSO (proyector antes de abrir). */
export default async function RecintoEsperaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [config, sesion] = await Promise.all([
    getConfiguracionSitio(),
    prisma.sesion.findUnique({ where: { id } }),
  ]);
  if (!sesion) {
    return (
      <PantallaEscalador>
        <div className="flex h-[1080px] w-[1920px] items-center justify-center bg-[#0a1628] text-white">
          <p className="text-4xl">Sesión no encontrada</p>
        </div>
      </PantallaEscalador>
    );
  }

  const enCurso = sesion.estado === "EN_CURSO";

  return (
    <PantallaEscalador>
      <div
        className="flex h-[1080px] w-[1920px] flex-col items-center justify-center text-white"
        style={{ background: `linear-gradient(160deg, ${config.colorPrimario}, #0a1628)` }}
      >
        {config.logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.logoSrc} alt="" className="mb-8 h-32 w-32 rounded-2xl object-contain bg-white/10" />
        ) : null}
        <h1 className="text-5xl font-bold">{config.nombreConcejo}</h1>
        <p className="mt-2 text-2xl text-white/70">{config.nombreMunicipio}</p>
        <p className="mt-10 text-3xl">
          Sesión {TIPO_SESION[sesion.tipo as TipoSesion]} N° {sesion.numero}/{sesion.anio}
        </p>
        <p className="mt-4 rounded-full bg-white/10 px-6 py-2 text-xl">
          {ESTADO_SESION[sesion.estado as EstadoSesion]}
        </p>
        {enCurso ? (
          <Link
            href={`/recinto/${id}`}
            className="mt-12 rounded-2xl bg-emerald-500 px-10 py-4 text-2xl font-bold hover:bg-emerald-400"
          >
            Ir a pantalla en vivo
          </Link>
        ) : (
          <p className="mt-12 max-w-xl text-center text-lg text-white/50">
            La pantalla del recinto se activará automáticamente cuando el secretario inicie la sesión.
          </p>
        )}
      </div>
    </PantallaEscalador>
  );
}
