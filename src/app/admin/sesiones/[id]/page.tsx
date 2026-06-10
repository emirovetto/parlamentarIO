import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_SESIONES } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Badge, Field, inputClass, btnPrimary, btnSecondary, btnSuccess } from "@/components/ui";
import { fechaHora, TIPO_SESION, ESTADO_SESION, nroExpediente, TIPO_DICTAMEN } from "@/lib/format";
import { OrdenDelDiaEditor } from "./OrdenDelDiaEditor";
import { agregarPunto, publicarSesion, cambiarEstadoSesion, guardarActaYVideo, marcarTimestampPunto } from "../actions";
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
    },
  });
  if (!sesion) notFound();

  // Dictámenes disponibles para incorporar al Orden del Día
  const dictamenesDisponibles = await prisma.dictamen.findMany({
    where: {
      expediente: { estado: "CON_DICTAMEN" },
      puntosOrden: { none: {} },
    },
    include: { expediente: true, comision: true },
    orderBy: { fecha: "desc" },
  });

  const editable = sesion.estado === EstadoSesion.PROGRAMADA;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/sesiones" className="text-sm text-blue-700 underline">
          ← Sesiones
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            Sesión {TIPO_SESION[sesion.tipo]} N° {sesion.numero}/{sesion.anio}
          </h1>
          <Badge className="bg-blue-100 text-blue-800">{ESTADO_SESION[sesion.estado]}</Badge>
          {sesion.publicada ? <Badge className="bg-green-100 text-green-800">Orden del Día publicado</Badge> : null}
        </div>
        <p className="text-sm text-slate-500">{fechaHora(sesion.fecha)}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {!sesion.publicada && sesion.puntos.length > 0 ? (
          <form action={publicarSesion.bind(null, sesion.id)}>
            <button type="submit" className={btnPrimary}>
              Publicar Orden del Día
            </button>
          </form>
        ) : null}
        {sesion.estado === EstadoSesion.PROGRAMADA ? (
          <form action={cambiarEstadoSesion.bind(null, sesion.id, EstadoSesion.EN_CURSO)}>
            <button type="submit" className={btnSuccess}>
              Iniciar sesión (abrir recinto)
            </button>
          </form>
        ) : null}
        {sesion.estado === EstadoSesion.EN_CURSO ? (
          <>
            <Link href={`/admin/sesiones/${sesion.id}/vivo`} className={btnSuccess}>
              Ir al recinto en vivo
            </Link>
            <form action={cambiarEstadoSesion.bind(null, sesion.id, EstadoSesion.FINALIZADA)}>
              <button type="submit" className={btnSecondary}>
                Finalizar sesión
              </button>
            </form>
          </>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Orden del Día"
              subtitle={editable ? "Arrastrá los puntos para reordenarlos" : "El orden quedó fijado al iniciar la sesión"}
            />
            <CardBody>
              <OrdenDelDiaEditor
                sesionId={sesion.id}
                editable={editable}
                puntos={sesion.puntos.map((p) => ({
                  id: p.id,
                  orden: p.orden,
                  titulo: p.titulo,
                  tratado: p.tratado,
                  expedienteNro: p.expediente ? nroExpediente(p.expediente) : null,
                }))}
              />
              {editable ? (
                <form action={agregarPunto.bind(null, sesion.id)} className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">Agregar punto</p>
                  <Field label="Título del punto" required>
                    <input name="titulo" required minLength={3} className={inputClass} placeholder="Ej.: Dictamen de la Comisión de Hacienda sobre..." />
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
                  <button type="submit" className={btnSecondary}>
                    Agregar al Orden del Día
                  </button>
                </form>
              ) : null}
            </CardBody>
          </Card>

          {sesion.estado === EstadoSesion.FINALIZADA ? (
            <Card>
              <CardHeader title="Diario de Sesiones" subtitle="Acta y video con marcas de tiempo" />
              <CardBody className="space-y-4">
                <form action={guardarActaYVideo.bind(null, sesion.id)} className="space-y-3">
                  <Field label="Acta de la sesión">
                    <textarea name="acta" rows={8} defaultValue={sesion.acta ?? ""} className={inputClass} placeholder="En la ciudad de..., a los ... días del mes de ..., se reúnen..." />
                  </Field>
                  <Field label="URL del video (YouTube/Vimeo)">
                    <input name="videoUrl" type="url" defaultValue={sesion.videoUrl ?? ""} className={inputClass} placeholder="https://www.youtube.com/watch?v=..." />
                  </Field>
                  <button type="submit" className={btnPrimary}>
                    Guardar
                  </button>
                </form>
                {sesion.videoUrl ? (
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <p className="text-sm font-medium text-slate-700">Marcas de tiempo por punto</p>
                    {sesion.puntos.map((p) => (
                      <form key={p.id} action={marcarTimestampPunto.bind(null, p.id, sesion.id)} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                          {p.orden}. {p.titulo}
                        </span>
                        <input name="videoTimestamp" defaultValue={p.videoTimestamp ?? ""} placeholder="hh:mm:ss" className={`${inputClass} w-28`} />
                        <button type="submit" className="text-sm text-blue-700 underline">
                          Guardar
                        </button>
                      </form>
                    ))}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </div>

        <Card className="h-fit">
          <CardHeader title="Votaciones de la sesión" />
          <CardBody>
            {sesion.votaciones.length === 0 ? (
              <p className="text-sm text-slate-500">Sin votaciones registradas.</p>
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
      </div>
    </div>
  );
}
