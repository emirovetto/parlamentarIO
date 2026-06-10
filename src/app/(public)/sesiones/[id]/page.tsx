import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { fechaHora, TIPO_SESION, ESTADO_SESION, nroExpediente, VALOR_VOTO } from "@/lib/format";

export const metadata = { title: "Sesión" };
export const revalidate = 120;

function videoConTimestamp(videoUrl: string, ts?: string | null): string {
  if (!ts) return videoUrl;
  const partes = ts.split(":").map(Number).reverse();
  const segundos = (partes[0] ?? 0) + (partes[1] ?? 0) * 60 + (partes[2] ?? 0) * 3600;
  const sep = videoUrl.includes("?") ? "&" : "?";
  return `${videoUrl}${sep}t=${segundos}`;
}

export default async function SesionPublicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await prisma.sesion.findUnique({
    where: { id },
    include: {
      puntos: { orderBy: { orden: "asc" }, include: { expediente: true } },
      votaciones: {
        where: { abierta: false },
        orderBy: { createdAt: "asc" },
        include: { votos: { include: { concejal: { include: { bloque: true } } } } },
      },
    },
  });
  if (!sesion || !sesion.publicada) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/sesiones" className="text-sm text-blue-700 underline">← Sesiones</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            Sesión {TIPO_SESION[sesion.tipo]} N° {sesion.numero}/{sesion.anio}
          </h1>
          <Badge className="bg-blue-100 text-blue-800">{ESTADO_SESION[sesion.estado]}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">{fechaHora(sesion.fecha)}</p>
      </div>

      <section aria-labelledby="orden" className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 id="orden" className="text-lg font-semibold text-slate-900">Orden del Día</h2>
        <ol className="mt-3 space-y-2">
          {sesion.puntos.map((p) => (
            <li key={p.id} className="flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600">
                {p.orden}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-900">{p.titulo}</p>
                {p.expediente ? (
                  <Link href={`/expedientes/${p.expediente.id}`} className="text-xs text-blue-700 underline">
                    Expte. {nroExpediente(p.expediente)}
                  </Link>
                ) : null}
              </div>
              {sesion.videoUrl && p.videoTimestamp ? (
                <a
                  href={videoConTimestamp(sesion.videoUrl, p.videoTimestamp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-blue-700 underline"
                >
                  ▶ Ver en video ({p.videoTimestamp})
                </a>
              ) : null}
              {p.tratado ? <Badge className="bg-green-100 text-green-800">Tratado</Badge> : null}
            </li>
          ))}
        </ol>
      </section>

      {sesion.videoUrl ? (
        <section aria-labelledby="video" className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 id="video" className="text-lg font-semibold text-slate-900">Video de la sesión</h2>
          <a href={sesion.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-blue-700 underline">
            Ver la transmisión completa
          </a>
        </section>
      ) : null}

      {sesion.votaciones.length > 0 ? (
        <section aria-labelledby="votaciones" className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 id="votaciones" className="text-lg font-semibold text-slate-900">Votaciones</h2>
          <ul className="mt-3 space-y-4">
            {sesion.votaciones.map((v) => (
              <li key={v.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{v.titulo}</p>
                  <Badge className={v.aprobada ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {v.aprobada ? "Aprobada" : "Rechazada"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">{v.resultado}</p>
                {v.tipo === "NOMINAL" && v.votos.length > 0 ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-blue-700">Voto nominal</summary>
                    <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                      {v.votos.map((voto) => (
                        <li key={voto.id} className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5 text-sm">
                          <span className="text-slate-700">
                            {voto.concejal.apellido}, {voto.concejal.nombre}
                            <span className="ml-1 text-xs text-slate-400">({voto.concejal.bloque.nombre})</span>
                          </span>
                          <span className={
                            voto.valor === "AFIRMATIVO" ? "font-medium text-green-700"
                            : voto.valor === "NEGATIVO" ? "font-medium text-red-700"
                            : "font-medium text-amber-700"
                          }>
                            {VALOR_VOTO[voto.valor]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sesion.acta ? (
        <section aria-labelledby="acta" className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 id="acta" className="text-lg font-semibold text-slate-900">Acta de la sesión</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{sesion.acta}</p>
        </section>
      ) : null}
    </div>
  );
}
