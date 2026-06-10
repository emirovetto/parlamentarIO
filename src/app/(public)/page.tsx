import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { getConfiguracionSitio } from "@/lib/configuracion";
import { getAgendaPublica } from "@/lib/agenda";
import { imagenUrl } from "@/lib/imagenes";
import { fechaHora, fecha, nroExpediente, TIPO_SESION, TIPO_NORMATIVA, ESTADO_EXPEDIENTE, ESTADO_COLOR, CARGO_AUTORIDAD, CATEGORIA_NOTICIA } from "@/lib/format";

export const revalidate = 300;

export default async function HomePage() {
  const [config, sesionEnVivo, proximaSesion, ultimasNormas, autoridades, audiencia, noticias, agenda] =
    await Promise.all([
      getConfiguracionSitio(),
      prisma.sesion.findFirst({
        where: { estado: "EN_CURSO", publicada: true, videoEnVivoUrl: { not: null } },
        orderBy: { fecha: "desc" },
      }),
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
      prisma.noticia.findMany({
        where: { publicada: true, destacada: true },
        orderBy: { publicadaEn: "desc" },
        take: 4,
      }),
      getAgendaPublica(14),
    ]);

  const heroTitulo = config.slogan ?? `El ${config.nombreConcejo}, abierto a la ciudadanía`;
  const heroTexto =
    config.textoHero ??
    "Seguí los proyectos de ordenanza, las sesiones del cuerpo y la actividad de tus concejales. Participá con la Banca del Ciudadano y las audiencias públicas.";

  return (
    <div className="space-y-10">
      {config.mostrarSesionEnVivo && sesionEnVivo ? (
        <section className="rounded-2xl border-2 border-red-400 bg-red-50 px-6 py-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Sesión en curso — transmisión en vivo</p>
          <p className="mt-1 font-medium text-slate-900">
            Sesión {TIPO_SESION[sesionEnVivo.tipo]} N° {sesionEnVivo.numero}/{sesionEnVivo.anio}
          </p>
          <Link href={`/sesiones/${sesionEnVivo.id}`} className="mt-3 inline-block rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Ver transmisión en vivo
          </Link>
        </section>
      ) : null}

      <section
        className="rounded-2xl px-8 py-12 text-white"
        style={{ background: `linear-gradient(to right, ${config.colorPrimario}, ${config.colorSecundario})` }}
      >
        <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">{heroTitulo}</h1>
        <p className="mt-3 max-w-2xl text-white/90">{heroTexto}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/digesto" className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-100" style={{ color: config.colorPrimario }}>
            Buscar en el Digesto
          </Link>
          <Link href="/noticias" className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
            Noticias
          </Link>
          <Link href="/participacion" className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
            Participar
          </Link>
        </div>
      </section>

      {noticias.length > 0 ? (
        <section aria-labelledby="titulo-noticias">
          <div className="flex items-center justify-between">
            <h2 id="titulo-noticias" className="text-lg font-semibold text-slate-900">Noticias destacadas</h2>
            <Link href="/noticias" className="text-sm text-blue-700 underline">Ver todas</Link>
          </div>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {noticias.map((n) => {
              const img = imagenUrl(n.imagenId);
              return (
                <li key={n.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex gap-4 p-4">
                    {img ? (
                      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <Image src={img} alt="" fill className="object-cover" unoptimized />
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <Badge className="bg-slate-100 text-slate-600">{CATEGORIA_NOTICIA[n.categoria]}</Badge>
                      <Link href={`/noticias/${n.slug}`} className="mt-1 block font-medium text-slate-900 hover:underline line-clamp-2">
                        {n.titulo}
                      </Link>
                      <p className="mt-1 text-xs text-slate-400">{fecha(n.publicadaEn ?? n.createdAt)}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="titulo-agenda" className="lg:col-span-1 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 id="titulo-agenda" className="text-lg font-semibold text-slate-900">Agenda institucional</h2>
              <Link href="/agenda" className="text-sm text-blue-700 underline">Ver agenda</Link>
            </div>
            <ul className="mt-3 space-y-2">
              {agenda.slice(0, 4).map((e) => (
                <li key={e.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs text-slate-500">{fechaHora(e.fecha)}</p>
                  {e.link ? (
                    <Link href={e.link} className="text-sm font-medium text-slate-900 hover:underline">{e.titulo}</Link>
                  ) : (
                    <p className="text-sm font-medium text-slate-900">{e.titulo}</p>
                  )}
                </li>
              ))}
              {agenda.length === 0 ? <li className="text-sm text-slate-500">Sin eventos próximos.</li> : null}
            </ul>
          </div>

          {proximaSesion ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">Próxima sesión</h3>
              <p className="mt-1 font-medium text-slate-800">
                Sesión {TIPO_SESION[proximaSesion.tipo]} N° {proximaSesion.numero}/{proximaSesion.anio}
              </p>
              <p className="mt-1 text-sm text-slate-500">{fechaHora(proximaSesion.fecha)}</p>
              <Link href={`/sesiones/${proximaSesion.id}`} className="mt-3 inline-block text-sm text-blue-700 underline">
                Ver Orden del Día
              </Link>
            </div>
          ) : null}

          {audiencia ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
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
