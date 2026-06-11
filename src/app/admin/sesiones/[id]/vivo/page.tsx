import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_SESIONES } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Badge, Field, inputClass, btnPrimary, btnSecondary, btnDanger } from "@/components/ui";
import { TIPO_SESION, TIPO_VOTACION, MAYORIA, VALOR_VOTO } from "@/lib/format";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Cronometro } from "@/components/Cronometro";
import {
  marcarAsistencia, registrarMocion, resolverMocion,
  iniciarUsoPalabra, finalizarUsoPalabra,
  abrirVotacion, cerrarVotacion, guardarTransmisionEnVivo,
} from "../../actions";
import { YoutubeEmbed } from "@/components/YoutubeEmbed";
import { TipoVotacion, MayoriaRequerida } from "@/generated/prisma/client";

export const metadata = { title: "Recinto en vivo" };

export default async function RecintoVivoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(GESTION_SESIONES);
  const { id } = await params;

  const sesion = await prisma.sesion.findUnique({
    where: { id },
    include: {
      asistencias: true,
      puntos: { orderBy: { orden: "asc" } },
      mociones: { orderBy: { createdAt: "desc" }, take: 10 },
      votaciones: {
        orderBy: { createdAt: "desc" },
        include: { votos: { include: { concejal: true } } },
      },
      usosPalabra: { where: { duracionSegundos: null }, include: { concejal: true } },
    },
  });
  if (!sesion) notFound();
  if (sesion.estado !== "EN_CURSO") {
    return (
      <div className="space-y-4">
        <p className="text-slate-600">La sesión no está en curso.</p>
        <Link href={`/admin/sesiones/${id}`} className="text-blue-700 underline">
          Volver a la sesión
        </Link>
      </div>
    );
  }

  const concejales = await prisma.concejal.findMany({ where: { activo: true }, orderBy: { apellido: "asc" }, include: { bloque: true } });

  const presentes = sesion.asistencias.filter((a) => a.presente).map((a) => a.concejalId);
  const totalCuerpo = concejales.length;
  const quorum = Math.floor(totalCuerpo / 2) + 1;
  const hayQuorum = presentes.length >= quorum;
  const votacionAbierta = sesion.votaciones.find((v) => v.abierta);
  const palabraActiva = sesion.usosPalabra[0];
  const puntoPendiente = sesion.puntos.find((p) => !p.tratado);

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={5000} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/admin/sesiones/${sesion.id}`} className="text-sm text-blue-700 underline">
            ← Sesión N° {sesion.numero}/{sesion.anio}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">
            Recinto digital — Sesión {TIPO_SESION[sesion.tipo]} N° {sesion.numero}/{sesion.anio}
          </h1>
        </div>
        <Link
          href={`/recinto/${sesion.id}`}
          target="_blank"
          className="rounded-xl bg-[#0a1628] px-5 py-3 text-center text-white hover:bg-[#152238]"
        >
          <p className="text-sm font-semibold text-sky-300">Pantalla del recinto</p>
          <p className="text-xs text-white/60">1920×1080 · TV / streaming</p>
        </Link>
        <div className={`rounded-xl px-5 py-3 text-center ${hayQuorum ? "bg-green-100" : "bg-red-100"}`} role="status">
          <p className={`text-2xl font-bold ${hayQuorum ? "text-green-800" : "text-red-800"}`}>
            {presentes.length}/{totalCuerpo}
          </p>
          <p className={`text-xs font-medium ${hayQuorum ? "text-green-700" : "text-red-700"}`}>
            {hayQuorum ? "HAY QUÓRUM" : `SIN QUÓRUM (mín. ${quorum})`}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader title="Transmisión YouTube" subtitle="Visible en el portal público mientras la sesión está en curso" />
        <CardBody className="space-y-3">
          {sesion.videoEnVivoUrl ? <YoutubeEmbed url={sesion.videoEnVivoUrl} title="Transmisión en vivo" /> : null}
          <form action={guardarTransmisionEnVivo.bind(null, sesion.id)} className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <Field label="URL de YouTube">
                <input name="videoEnVivoUrl" type="url" required defaultValue={sesion.videoEnVivoUrl ?? ""} className={inputClass} placeholder="https://www.youtube.com/live/..." />
              </Field>
            </div>
            <button type="submit" className={btnPrimary}>Guardar</button>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Asistencia */}
        <Card>
          <CardHeader title="Asistencia" subtitle="Marcá presentes y ausentes" />
          <CardBody>
            <ul className="space-y-2">
              {concejales.map((c) => {
                const presente = presentes.includes(c.id);
                return (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-slate-900">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.bloque.color }} aria-hidden />
                      <span className="truncate">{c.apellido}, {c.nombre}</span>
                    </span>
                    <form action={marcarAsistencia.bind(null, sesion.id, c.id, !presente)}>
                      <button
                        type="submit"
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          presente ? "bg-green-600 text-white" : "bg-slate-300 text-slate-700"
                        }`}
                      >
                        {presente ? "Presente" : "Ausente"}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        {/* Palabra y votación */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Uso de la palabra" />
            <CardBody>
              {palabraActiva ? (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-slate-600">En uso de la palabra:</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {palabraActiva.concejal.apellido}, {palabraActiva.concejal.nombre}
                  </p>
                  <Cronometro inicioIso={palabraActiva.inicio.toISOString()} />
                  <form action={finalizarUsoPalabra.bind(null, sesion.id)}>
                    <button type="submit" className={btnDanger}>
                      Finalizar palabra
                    </button>
                  </form>
                </div>
              ) : (
                <form action={iniciarUsoPalabra.bind(null, sesion.id)} className="space-y-3">
                  <Field label="Conceder la palabra a" required>
                    <select name="concejalId" required className={inputClass}>
                      {concejales
                        .filter((c) => presentes.includes(c.id))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.apellido}, {c.nombre}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <button type="submit" className={btnPrimary}>
                    Dar la palabra
                  </button>
                </form>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Votación electrónica" />
            <CardBody>
              {votacionAbierta ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-900">{votacionAbierta.titulo}</p>
                  <p className="text-xs text-slate-500">
                    {TIPO_VOTACION[votacionAbierta.tipo]} · {MAYORIA[votacionAbierta.mayoria]}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center" aria-live="polite">
                    {(["AFIRMATIVO", "NEGATIVO", "ABSTENCION"] as const).map((valor) => {
                      const n = votacionAbierta.votos.filter((v) => v.valor === valor).length;
                      const color = valor === "AFIRMATIVO" ? "bg-green-50 text-green-800" : valor === "NEGATIVO" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800";
                      return (
                        <div key={valor} className={`rounded-lg px-2 py-3 ${color}`}>
                          <p className="text-2xl font-bold">{n}</p>
                          <p className="text-xs">{VALOR_VOTO[valor]}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500">
                    Votaron {votacionAbierta.votos.length} de {presentes.length} presentes:{" "}
                    {votacionAbierta.votos.map((v) => v.concejal.apellido).join(", ") || "—"}
                  </p>
                  <form action={cerrarVotacion.bind(null, votacionAbierta.id)}>
                    <button type="submit" className={btnDanger}>
                      Cerrar votación y computar resultado
                    </button>
                  </form>
                </div>
              ) : hayQuorum ? (
                <form action={abrirVotacion.bind(null, sesion.id)} className="space-y-3">
                  <Field label="Asunto a votar" required>
                    <input
                      name="titulo"
                      required
                      defaultValue={puntoPendiente ? puntoPendiente.titulo : ""}
                      className={inputClass}
                    />
                  </Field>
                  <input type="hidden" name="puntoId" value={puntoPendiente?.id ?? ""} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Modalidad" required>
                      <select name="tipo" required className={inputClass}>
                        {Object.values(TipoVotacion).map((t) => (
                          <option key={t} value={t}>
                            {TIPO_VOTACION[t]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Mayoría requerida" required>
                      <select name="mayoria" required className={inputClass}>
                        {Object.values(MayoriaRequerida).map((m) => (
                          <option key={m} value={m}>
                            {MAYORIA[m]}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <button type="submit" className={btnPrimary}>
                    Abrir votación
                  </button>
                  <p className="text-xs text-slate-500">
                    Los concejales presentes votan desde su dispositivo en &quot;Mi banca&quot;.
                  </p>
                </form>
              ) : (
                <p className="text-sm text-red-700">No se puede abrir una votación sin quórum.</p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Mociones y resultados */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Mociones" />
            <CardBody className="space-y-3">
              <form action={registrarMocion.bind(null, sesion.id)} className="space-y-2 rounded-lg bg-slate-50 p-3">
                <input name="presentadaPor" required placeholder="Presentada por..." className={inputClass} />
                <textarea name="texto" required rows={2} placeholder="Texto de la moción..." className={inputClass} />
                <button type="submit" className={btnSecondary}>
                  Registrar moción
                </button>
              </form>
              {sesion.mociones.map((m) => (
                <div key={m.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm text-slate-900">{m.texto}</p>
                  <p className="text-xs text-slate-500">Por {m.presentadaPor}</p>
                  {m.aprobada === null ? (
                    <div className="mt-2 flex gap-2">
                      <form action={resolverMocion.bind(null, m.id, sesion.id, true)}>
                        <button type="submit" className="text-xs text-green-700 underline">Aprobar</button>
                      </form>
                      <form action={resolverMocion.bind(null, m.id, sesion.id, false)}>
                        <button type="submit" className="text-xs text-red-700 underline">Rechazar</button>
                      </form>
                    </div>
                  ) : (
                    <Badge className={`mt-2 ${m.aprobada ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {m.aprobada ? "Aprobada" : "Rechazada"}
                    </Badge>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Votaciones cerradas" />
            <CardBody>
              {sesion.votaciones.filter((v) => !v.abierta).length === 0 ? (
                <p className="text-sm text-slate-500">Aún no hay resultados.</p>
              ) : (
                <ul className="space-y-2">
                  {sesion.votaciones
                    .filter((v) => !v.abierta)
                    .map((v) => (
                      <li key={v.id} className="rounded-lg border border-slate-200 p-3">
                        <p className="text-sm font-medium text-slate-900">{v.titulo}</p>
                        <Badge className={`mt-1 ${v.aprobada ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {v.aprobada ? "Aprobada" : "Rechazada"}
                        </Badge>
                        <p className="mt-1 text-xs text-slate-500">{v.resultado}</p>
                      </li>
                    ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
