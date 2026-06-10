import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_PARTICIPACION } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Badge, Field, inputClass, btnPrimary, btnSecondary } from "@/components/ui";
import { fechaHora, ESTADO_SOLICITUD, ESTADO_AUDIENCIA, TIPO_SESION } from "@/lib/format";
import {
  resolverSolicitudBanca, crearAudiencia, cambiarEstadoAudiencia,
  cargarResolucionAudiencia, subirMaterialAudiencia,
} from "./actions";
import { EstadoSolicitud, EstadoAudiencia } from "@/generated/prisma/client";

export const metadata = { title: "Participación ciudadana" };

const ESTADO_SOLICITUD_COLOR: Record<EstadoSolicitud, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  APROBADA: "bg-green-100 text-green-800",
  RECHAZADA: "bg-red-100 text-red-800",
  REALIZADA: "bg-slate-200 text-slate-700",
};

export default async function ParticipacionAdminPage() {
  await requireRole(GESTION_PARTICIPACION);

  const [solicitudes, audiencias, sesionesProximas] = await Promise.all([
    prisma.solicitudBanca.findMany({
      orderBy: { createdAt: "desc" },
      include: { sesion: true },
      take: 50,
    }),
    prisma.audienciaPublica.findMany({
      orderBy: { fecha: "desc" },
      include: { inscripciones: { orderBy: { createdAt: "asc" } }, documentos: { select: { id: true, nombre: true } } },
      take: 20,
    }),
    prisma.sesion.findMany({ where: { estado: "PROGRAMADA" }, orderBy: { fecha: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Participación ciudadana</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Solicitudes de Banca del Ciudadano" subtitle="Validá identidad y asigná sesión" />
          <CardBody className="space-y-4">
            {solicitudes.length === 0 ? (
              <p className="text-sm text-slate-500">No hay solicitudes.</p>
            ) : (
              solicitudes.map((s) => (
                <div key={s.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">
                      {s.apellido}, {s.nombre} <span className="text-xs text-slate-500">DNI {s.dni}</span>
                    </p>
                    <Badge className={ESTADO_SOLICITUD_COLOR[s.estado]}>{ESTADO_SOLICITUD[s.estado]}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-700">{s.tema}</p>
                  <p className="mt-1 text-sm text-slate-600">{s.fundamentacion}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {fechaHora(s.createdAt)} · {s.email}{s.telefono ? ` · ${s.telefono}` : ""}
                    {s.sesion ? ` · Asignada a sesión N° ${s.sesion.numero}/${s.sesion.anio}` : ""}
                  </p>
                  {s.estado === "PENDIENTE" || s.estado === "APROBADA" ? (
                    <form action={resolverSolicitudBanca.bind(null, s.id)} className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
                      <div className="min-w-32">
                        <Field label="Estado">
                          <select name="estado" defaultValue={s.estado} className={inputClass}>
                            {Object.values(EstadoSolicitud).map((e) => (
                              <option key={e} value={e}>{ESTADO_SOLICITUD[e]}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <div className="min-w-44">
                        <Field label="Sesión asignada">
                          <select name="sesionId" defaultValue={s.sesionId ?? ""} className={inputClass}>
                            <option value="">—</option>
                            {sesionesProximas.map((ses) => (
                              <option key={ses.id} value={ses.id}>
                                N° {ses.numero}/{ses.anio} ({TIPO_SESION[ses.tipo]})
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <div className="min-w-44 flex-1">
                        <Field label="Respuesta al vecino">
                          <input name="respuesta" defaultValue={s.respuesta ?? ""} className={inputClass} />
                        </Field>
                      </div>
                      <button type="submit" className={btnSecondary}>Guardar</button>
                    </form>
                  ) : null}
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Convocar audiencia pública" />
            <CardBody>
              <form action={crearAudiencia} className="space-y-3">
                <Field label="Título" required>
                  <input name="titulo" required minLength={5} className={inputClass} />
                </Field>
                <Field label="Descripción" required>
                  <textarea name="descripcion" rows={3} required minLength={10} className={inputClass} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Fecha y hora" required>
                    <input name="fecha" type="datetime-local" required className={inputClass} />
                  </Field>
                  <Field label="Lugar" required>
                    <input name="lugar" required minLength={3} className={inputClass} defaultValue="Recinto del Concejo Municipal" />
                  </Field>
                </div>
                <button type="submit" className={btnPrimary}>Convocar</button>
              </form>
            </CardBody>
          </Card>

          {audiencias.map((a) => (
            <Card key={a.id}>
              <CardHeader
                title={a.titulo}
                subtitle={`${fechaHora(a.fecha)} · ${a.lugar}`}
                action={<Badge className="bg-amber-100 text-amber-800">{ESTADO_AUDIENCIA[a.estado]}</Badge>}
              />
              <CardBody className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {a.estado === "CONVOCADA" ? (
                    <form action={cambiarEstadoAudiencia.bind(null, a.id, EstadoAudiencia.INSCRIPCION_ABIERTA)}>
                      <button type="submit" className={btnSecondary}>Abrir inscripción</button>
                    </form>
                  ) : null}
                  {a.estado === "INSCRIPCION_ABIERTA" ? (
                    <form action={cambiarEstadoAudiencia.bind(null, a.id, EstadoAudiencia.REALIZADA)}>
                      <button type="submit" className={btnSecondary}>Marcar realizada</button>
                    </form>
                  ) : null}
                </div>

                <details>
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">
                    Inscriptos ({a.inscripciones.length})
                  </summary>
                  {a.inscripciones.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">Sin inscriptos.</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {a.inscripciones.map((i) => (
                        <li key={i.id} className="rounded bg-slate-50 px-3 py-2 text-sm">
                          <span className="font-medium text-slate-900">{i.apellido}, {i.nombre}</span>
                          <span className="ml-2 text-xs text-slate-500">DNI {i.dni} · {i.email}</span>
                          {i.postura ? <p className="mt-1 text-xs text-slate-600">{i.postura}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </details>

                <form action={subirMaterialAudiencia.bind(null, a.id)} className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <input name="archivo" type="file" accept="application/pdf" required className="flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm" />
                  <button type="submit" className={btnSecondary}>Subir material</button>
                </form>
                {a.documentos.length > 0 ? (
                  <ul className="text-sm">
                    {a.documentos.map((d) => (
                      <li key={d.id}>
                        <a href={`/api/documentos/${d.id}`} className="text-blue-700 underline">{d.nombre}</a>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {!a.resolucion && a.estado === "REALIZADA" ? (
                  <form action={cargarResolucionAudiencia.bind(null, a.id)} className="space-y-2 border-t border-slate-100 pt-3">
                    <Field label="Resolución / conclusiones">
                      <textarea name="resolucion" rows={3} required className={inputClass} />
                    </Field>
                    <button type="submit" className={btnSecondary}>Publicar resolución</button>
                  </form>
                ) : a.resolucion ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <strong>Resolución:</strong> {a.resolucion}
                  </p>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
