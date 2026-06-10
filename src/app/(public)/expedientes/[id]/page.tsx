import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { nroExpediente, fecha, fechaHora, TIPO_NORMATIVA, ESTADO_EXPEDIENTE, ESTADO_COLOR, ORIGEN_EXPEDIENTE, TIPO_DICTAMEN } from "@/lib/format";

export const metadata = { title: "Expediente" };
export const revalidate = 120;

export default async function ExpedientePublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exp = await prisma.expediente.findUnique({
    where: { id },
    include: {
      bloque: true,
      autores: { include: { concejal: true } },
      giros: { include: { comision: true }, orderBy: { orden: "asc" } },
      dictamenes: { include: { comision: true }, orderBy: { fecha: "desc" } },
      documentos: { where: { publico: true }, select: { id: true, nombre: true, hashSha256: true, createdAt: true } },
      historial: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!exp) notFound();

  // Anonimización (Ley 25.326): expedientes sensibles muestran solo la versión pública
  const textoVisible = exp.esSensible ? exp.versionPublica : exp.textoCompleto;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/digesto" className="text-sm text-blue-700 underline">← Digesto Legislativo</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            Expte. {nroExpediente(exp)} — {TIPO_NORMATIVA[exp.tipo]}
          </h1>
          <Badge className={ESTADO_COLOR[exp.estado]}>{ESTADO_EXPEDIENTE[exp.estado]}</Badge>
        </div>
        {exp.numeroNorma ? <p className="mt-1 font-medium text-emerald-700">{exp.numeroNorma}</p> : null}
        <p className="mt-1 text-slate-600">{exp.caratula}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section aria-labelledby="texto" className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 id="texto" className="text-lg font-semibold text-slate-900">Texto</h2>
            {textoVisible ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{textoVisible}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Este expediente contiene datos personales protegidos (Ley 25.326). La versión pública estará disponible próximamente.
              </p>
            )}
          </section>

          {exp.dictamenes.length > 0 ? (
            <section aria-labelledby="dictamenes" className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 id="dictamenes" className="text-lg font-semibold text-slate-900">Dictámenes de comisión</h2>
              <ul className="mt-3 space-y-3">
                {exp.dictamenes.map((d) => (
                  <li key={d.id} className="rounded-lg bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{d.comision.nombre}</p>
                      <Badge className="bg-violet-100 text-violet-800">{TIPO_DICTAMEN[d.tipo]}</Badge>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{d.texto}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {exp.documentos.length > 0 ? (
            <section aria-labelledby="docs" className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 id="docs" className="text-lg font-semibold text-slate-900">Documentos públicos</h2>
              <ul className="mt-3 space-y-2">
                {exp.documentos.map((d) => (
                  <li key={d.id}>
                    <a href={`/api/documentos/${d.id}`} className="text-sm text-blue-700 underline">
                      {d.nombre}
                    </a>
                    <span className="ml-2 text-xs text-slate-400" title={d.hashSha256}>
                      (verificable: SHA-256 {d.hashSha256.slice(0, 12)}…)
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          <section aria-labelledby="datos" className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 id="datos" className="text-base font-semibold text-slate-900">Datos</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Origen</dt><dd className="text-right">{exp.bloque?.nombre ?? ORIGEN_EXPEDIENTE[exp.origen]}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Ingreso</dt><dd>{fecha(exp.fechaIngreso)}</dd></div>
              {exp.autores.length > 0 ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Autores</dt>
                  <dd className="text-right">
                    {exp.autores.map((a, i) => (
                      <span key={a.id}>
                        <Link href={`/concejales/${a.concejal.id}`} className="text-blue-700 hover:underline">
                          {a.concejal.apellido}
                        </Link>
                        {i < exp.autores.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
              {exp.giros.length > 0 ? (
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Comisiones</dt><dd className="text-right">{exp.giros.map((g) => g.comision.nombre).join(", ")}</dd></div>
              ) : null}
              {exp.fechaPromulgacion ? (
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Promulgación</dt><dd>{fecha(exp.fechaPromulgacion)}</dd></div>
              ) : null}
            </dl>
          </section>

          <section aria-labelledby="seguimiento" className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 id="seguimiento" className="text-base font-semibold text-slate-900">Seguimiento</h2>
            <ol className="mt-3 space-y-3">
              {exp.historial.map((m) => (
                <li key={m.id} className="border-l-2 border-slate-300 pl-3 text-sm">
                  <p className="font-medium text-slate-900">{ESTADO_EXPEDIENTE[m.estadoHasta]}</p>
                  <p className="text-xs text-slate-500">{fechaHora(m.createdAt)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
