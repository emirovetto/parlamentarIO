import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_SESIONES } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Badge, Field, inputClass, btnPrimary, btnSecondary, btnSuccess } from "@/components/ui";
import { YoutubeEmbed } from "@/components/YoutubeEmbed";
import { fechaHora, TIPO_SESION, ESTADO_SESION, nroExpediente, TIPO_DICTAMEN } from "@/lib/format";
import { OrdenDelDiaEditor } from "./OrdenDelDiaEditor";
import {
  agregarPunto, publicarSesion, cambiarEstadoSesion,
  guardarActaYVideo, marcarTimestampPunto,
  guardarTransmisionEnVivo, archivarSesion,
} from "../actions";
import { EstadoSesion } from "@/generated/prisma/client";

export const metadata = { title: "Sesión" };

export default async function SesionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(GESTION_SESIONES);
  const { id } = await params;

  const sesion = await prisma.sesion.findUnique({
    where: { id },
    include: {
      puntos: { orderBy: { orden: "asc" }, include: { expediente: true } },
      votaciones: { orderBy: { createdAt: "asc" } },
      asistencias: { include: { concejal: { include: { bloque: true } } } },
      mociones: { orderBy: { createdAt: "asc" } },
      usosPalabra: { include: { concejal: true }, orderBy: { inicio: "asc" } },
    },
  });
  if (!sesion) notFound();

  const dictamenesDisponibles = await prisma.dictamen.findMany({
    where: { expediente: { estado: "CON_DICTAMEN" }, puntosOrden: { none: {} } },
    include: { expediente: true, comision: true },
    orderBy: { fecha: "desc" },
  });

  const editable = sesion.estado === EstadoSesion.PROGRAMADA;
  const enVivo = sesion.estado === EstadoSesion.EN_CURSO;
  const finalizada = sesion.estado === EstadoSesion.FINALIZADA || sesion.archivada;
  const presentes = sesion.asistencias.filter((a) => a.presente);
  const puntosTratados = sesion.puntos.filter((p) => p.tratado).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/sesiones" className="text-sm text-blue-700 underline">← Sesiones</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            Sesión {TIPO_SESION[sesion.tipo]} N° {sesion.numero}/{sesion.anio}
          </h1>
          <Badge className="bg-blue-100 text-blue-800">{ESTADO_SESION[sesion.estado]}</Badge>
          {sesion.publicada ? <Badge className="bg-green-100 text-green-800">Orden del Día publicado</Badge> : null}
          {sesion.archivada ? <Badge className="bg-slate-200 text-slate-700">Archivada</Badge> : null}
          {enVivo && sesion.videoEnVivoUrl ? (
            <Badge className="bg-red-100 text-red-800">🔴 Transmisión en vivo</Badge>
          ) : null}
        </div>
        <p className="text-sm text-slate-500">
          Convocada: {fechaHora(sesion.fecha)}
          {sesion.horaInicioReal ? ` · Inicio real: ${fechaHora(sesion.horaInicioReal)}` : ""}
          {sesion.horaFinReal ? ` · Cierre: ${fechaHora(sesion.horaFinReal)}` : ""}
        </p>
      </div>

      {/* Acciones según fase de la sesión */}
      <div className="flex flex-wrap gap-3">
        {!sesion.publicada && sesion.puntos.length > 0 ? (
          <form action={publicarSesion.bind(null, sesion.id)}>
            <button type="submit" className={btnPrimary}>Publicar Orden del Día</button>
          </form>
        ) : null}
        {sesion.estado === EstadoSesion.PROGRAMADA ? (
          <form action={cambiarEstadoSesion.bind(null, sesion.id, EstadoSesion.EN_CURSO)}>
            <button type="submit" className={btnSuccess}>Iniciar sesión (abrir recinto)</button>
          </form>
        ) : null}
        {enVivo ? (
          <>
            <Link href={`/admin/sesiones/${sesion.id}/vivo`} className={btnSuccess}>Ir al recinto en vivo</Link>
            <form action={cambiarEstadoSesion.bind(null, sesion.id, EstadoSesion.FINALIZADA)}>
              <button type="submit" className={btnSecondary}>Finalizar sesión</button>
            </form>
          </>
        ) : null}
        {finalizada && !sesion.archivada ? (
          <Link href={`/sesiones/${sesion.id}`} target="_blank" className={btnSecondary}>
            Vista previa pública
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Transmisión en vivo — visible durante sesión EN_CURSO */}
          {(enVivo || sesion.videoEnVivoUrl) && !sesion.archivada ? (
            <Card>
              <CardHeader
                title="Transmisión en vivo"
                subtitle="Link de YouTube visible en el portal público mientras la sesión está en curso"
              />
              <CardBody className="space-y-4">
                {sesion.videoEnVivoUrl ? (
                  <>
                    <YoutubeEmbed url={sesion.videoEnVivoUrl} title={`Sesión N° ${sesion.numero} en vivo`} />
                    <p className="text-xs text-slate-500 break-all">{sesion.videoEnVivoUrl}</p>
                  </>
                ) : null}
                <form action={guardarTransmisionEnVivo.bind(null, sesion.id)} className="flex flex-wrap items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <Field label="URL de YouTube (live o watch)">
                      <input
                        name="videoEnVivoUrl"
                        type="url"
                        required
                        defaultValue={sesion.videoEnVivoUrl ?? ""}
                        placeholder="https://www.youtube.com/live/... o watch?v=..."
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <button type="submit" className={btnPrimary}>
                    {sesion.videoEnVivoUrl ? "Actualizar transmisión" : "Publicar transmisión"}
                  </button>
                </form>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Orden del Día" subtitle={editable ? "Arrastrá los puntos para reordenarlos" : "Orden fijado al iniciar la sesión"} />
            <CardBody>
              <OrdenDelDiaEditor
                sesionId={sesion.id}
                editable={editable}
                puntos={sesion.puntos.map((p) => ({
                  id: p.id, orden: p.orden, titulo: p.titulo, tratado: p.tratado,
                  expedienteNro: p.expediente ? nroExpediente(p.expediente) : null,
                }))}
              />
              {editable ? (
                <form action={agregarPunto.bind(null, sesion.id)} className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">Agregar punto</p>
                  <Field label="Título del punto" required>
                    <input name="titulo" required minLength={3} className={inputClass} />
                  </Field>
                  <Field label="Vincular dictamen (opcional)">
                    <select name="dictamenId" className={inputClass}>
                      <option value="">— Punto sin expediente —</option>
                      {dictamenesDisponibles.map((d) => (
                        <option key={d.id} value={d.id}>
                          Expte. {nroExpediente(d.expediente)} · {d.comision.nombre} · {TIPO_DICTAMEN[d.tipo]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button type="submit" className={btnSecondary}>Agregar al Orden del Día</button>
                </form>
              ) : null}
            </CardBody>
          </Card>

          {/* Post-sesión: acta, video archivado, notas, archivo histórico */}
          {finalizada ? (
            <>
              <Card>
                <CardHeader title="Diario de Sesiones" subtitle="Acta, grabación archivada y notas posteriores" />
                <CardBody className="space-y-4">
                  {sesion.videoUrl ? (
                    <YoutubeEmbed url={sesion.videoUrl} title={`Grabación sesión N° ${sesion.numero}`} />
                  ) : null}
                  <form action={guardarActaYVideo.bind(null, sesion.id)} className="space-y-3">
                    <Field label="Acta de la sesión">
                      <textarea name="acta" rows={8} defaultValue={sesion.acta ?? ""} className={inputClass} placeholder="En la ciudad de..., a los ... días del mes de ..., se reúnen..." />
                    </Field>
                    <Field label="URL del video archivado (grabación post-transmisión)">
                      <input name="videoUrl" type="url" defaultValue={sesion.videoUrl ?? ""} className={inputClass} placeholder="https://www.youtube.com/watch?v=..." />
                    </Field>
                    <Field label="Notas y observaciones post-sesión">
                      <textarea name="notasPostSesion" rows={3} defaultValue={sesion.notasPostSesion ?? ""} className={inputClass} placeholder="Incidentes, acuerdos informales, temas pendientes..." />
                    </Field>
                    <button type="submit" className={btnPrimary}>Guardar diario</button>
                  </form>
                  {(sesion.videoUrl || sesion.videoEnVivoUrl) ? (
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <p className="text-sm font-medium text-slate-700">Marcas de tiempo por punto (hh:mm:ss en el video)</p>
                      {sesion.puntos.map((p) => (
                        <form key={p.id} action={marcarTimestampPunto.bind(null, p.id, sesion.id)} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{p.orden}. {p.titulo}</span>
                          <input name="videoTimestamp" defaultValue={p.videoTimestamp ?? ""} placeholder="hh:mm:ss" className={`${inputClass} w-28`} />
                          <button type="submit" className="text-sm text-blue-700 underline">Guardar</button>
                        </form>
                      ))}
                    </div>
                  ) : null}
                </CardBody>
              </Card>

              {!sesion.archivada ? (
                <Card>
                  <CardHeader
                    title="Archivar sesión"
                    subtitle="Cierra la transmisión en vivo, publica la grabación en el historial y deja la sesión en el archivo público"
                  />
                  <CardBody>
                    <form action={archivarSesion.bind(null, sesion.id)} className="space-y-3">
                      <Field label="URL de grabación final (opcional si ya cargaste el video arriba)">
                        <input name="videoUrl" type="url" defaultValue={sesion.videoUrl ?? sesion.videoEnVivoUrl ?? ""} className={inputClass} />
                      </Field>
                      <p className="text-xs text-slate-500">
                        Si no indicás URL, se usará el video archivado o el link de la transmisión en vivo.
                      </p>
                      <button type="submit" className={btnPrimary}>Archivar y publicar en historial</button>
                    </form>
                  </CardBody>
                </Card>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Panel lateral: resumen y estadísticas */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Resumen de la sesión" />
            <CardBody>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Puntos en O.D.</dt><dd>{sesion.puntos.length}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Puntos tratados</dt><dd>{puntosTratados}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Votaciones</dt><dd>{sesion.votaciones.length}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Mociones</dt><dd>{sesion.mociones.length}</dd></div>
                {sesion.estado !== EstadoSesion.PROGRAMADA ? (
                  <div className="flex justify-between"><dt className="text-slate-500">Presentes</dt><dd>{presentes.length}</dd></div>
                ) : null}
              </dl>
            </CardBody>
          </Card>

          {presentes.length > 0 ? (
            <Card>
              <CardHeader title="Asistencia" subtitle={`${presentes.length} presentes`} />
              <CardBody>
                <ul className="space-y-1 text-sm text-slate-700">
                  {presentes.map((a) => (
                    <li key={a.id}>
                      <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: a.concejal.bloque.color }} aria-hidden />
                      {a.concejal.apellido}, {a.concejal.nombre}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Votaciones" />
            <CardBody>
              {sesion.votaciones.length === 0 ? (
                <p className="text-sm text-slate-500">Sin votaciones.</p>
              ) : (
                <ul className="space-y-3">
                  {sesion.votaciones.map((v) => (
                    <li key={v.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900">{v.titulo}</p>
                      {v.abierta ? (
                        <Badge className="mt-1 bg-green-100 text-green-800">En curso</Badge>
                      ) : (
                        <>
                          <Badge className={`mt-1 ${v.aprobada ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {v.aprobada ? "Aprobada" : "Rechazada"}
                          </Badge>
                          <p className="mt-1 text-xs text-slate-500">{v.resultado}</p>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {sesion.usosPalabra.length > 0 ? (
            <Card>
              <CardHeader title="Uso de la palabra" />
              <CardBody>
                <ul className="space-y-2 text-sm">
                  {sesion.usosPalabra.map((u) => (
                    <li key={u.id} className="flex justify-between text-slate-700">
                      <span>{u.concejal.apellido}</span>
                      <span className="text-slate-500">
                        {u.duracionSegundos ? `${Math.floor(u.duracionSegundos / 60)}:${String(u.duracionSegundos % 60).padStart(2, "0")}` : "en curso"}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
