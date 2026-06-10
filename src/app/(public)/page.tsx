import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { fechaHora, fecha, nroExpediente, TIPO_SESION, TIPO_NORMATIVA, ESTADO_EXPEDIENTE, ESTADO_COLOR, CARGO_AUTORIDAD } from "@/lib/format";

export const revalidate = 300;

export default async function HomePage() {
  const [proximaSesion, ultimasNormas, autoridades, audiencia] = await Promise.all([
    prisma.sesion.findFirst({
      where: { estado: { in: ["PROGRAMADA", "EN_CURSO"] }, publicada: true },
      orderBy: { fecha: "asc" },
    }),
    prisma.expediente.findMany({
      where: { estado: { in: ["PROMULGADO", "PUBLICADO"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.autoridad.findMany({
      where: { hasta: null },
      include: { concejal: true },
      orderBy: { cargo: "asc" },
    }),
    prisma.audienciaPublica.findFirst({
      where: { estado: { in: ["CONVOCADA", "INSCRIPCION_ABIERTA"] } },
      orderBy: { fecha: "asc" },
    }),
  ]);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] to-[#2d5482] px-8 py-12 text-white">
        <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">
          El Concejo Municipal, abierto a la ciudadanía
        </h1>
        <p className="mt-3 max-w-2xl text-slate-200">
          Seguí los proyectos de ordenanza, las sesiones del cuerpo y la actividad de tus concejales.
          Participá con la Banca del Ciudadano y las audiencias públicas.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/digesto" className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#1e3a5f] hover:bg-slate-100">
            Buscar en el Digesto
          </Link>
          <Link href="/participacion" className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
            Participar
          </Link>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="titulo-sesion" className="lg:col-span-1">
          <h2 id="titulo-sesion" className="text-lg font-semibold text-slate-900">Próxima sesión</h2>
          {proximaSesion ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5">
              <p className="font-medium text-slate-900">
                Sesión {TIPO_SESION[proximaSesion.tipo]} N° {proximaSesion.numero}/{proximaSesion.anio}
              </p>
              <p className="mt-1 text-sm text-slate-500">{fechaHora(proximaSesion.fecha)}</p>
              <Link href={`/sesiones/${proximaSesion.id}`} className="mt-3 inline-block text-sm text-blue-700 underline">
                Ver Orden del Día
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No hay sesiones convocadas por el momento.</p>
          )}

          {audiencia ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-900">Audiencia pública</p>
              <p className="mt-1 text-sm text-amber-800">{audiencia.titulo}</p>
              <p className="mt-1 text-xs text-amber-700">{fechaHora(audiencia.fecha)} · {audiencia.lugar}</p>
              <Link href="/participacion" className="mt-2 inline-block text-sm font-medium text-amber-900 underline">
                Inscribirse
              </Link>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="titulo-normas" className="lg:col-span-2">
          <h2 id="titulo-normas" className="text-lg font-semibold text-slate-900">Últimas normas sancionadas</h2>
          <ul className="mt-3 space-y-3">
            {ultimasNormas.length === 0 ? (
              <li className="text-sm text-slate-500">Aún no hay normas publicadas.</li>
            ) : (
              ultimasNormas.map((e) => (
                <li key={e.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/expedientes/${e.id}`} className="font-medium text-slate-900 hover:underline">
                      {e.numeroNorma ?? `${TIPO_NORMATIVA[e.tipo]} — Expte. ${nroExpediente(e)}`}
                    </Link>
                    <Badge className={ESTADO_COLOR[e.estado]}>{ESTADO_EXPEDIENTE[e.estado]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{e.caratula}</p>
                  <p className="mt-1 text-xs text-slate-400">Promulgada el {fecha(e.fechaPromulgacion)}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section aria-labelledby="titulo-autoridades">
        <h2 id="titulo-autoridades" className="text-lg font-semibold text-slate-900">Autoridades del Concejo</h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {autoridades.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{CARGO_AUTORIDAD[a.cargo]}</p>
              <Link href={`/concejales/${a.concejal.id}`} className="mt-1 block font-medium text-slate-900 hover:underline">
                {a.concejal.nombre} {a.concejal.apellido}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
