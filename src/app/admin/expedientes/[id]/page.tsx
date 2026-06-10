import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hasRole, GESTION_EXPEDIENTES } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Badge, Field, inputClass, btnPrimary, btnSecondary } from "@/components/ui";
import {
  nroExpediente, fecha, fechaHora,
  ESTADO_EXPEDIENTE, ESTADO_COLOR, TIPO_NORMATIVA, ORIGEN_EXPEDIENTE, TIPO_DICTAMEN,
} from "@/lib/format";
import { TRANSICIONES, vencimientoVeto } from "@/lib/expedientes";
import { cambiarEstado, girarAComision, emitirDictamen, firmarDictamen, subirDocumento, guardarVersionPublica, asignarNumeroNorma } from "../actions";
import { TipoDictamen, EstadoExpediente } from "@/generated/prisma/client";

export const metadata = { title: "Expediente" };

export default async function ExpedienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const exp = await prisma.expediente.findUnique({
    where: { id },
    include: {
      bloque: true,
      autores: { include: { concejal: true } },
      giros: { include: { comision: true }, orderBy: { orden: "asc" } },
      dictamenes: { include: { comision: true, firmas: { include: { concejal: true } } }, orderBy: { fecha: "desc" } },
      documentos: { select: { id: true, nombre: true, hashSha256: true, tamanio: true, publico: true, createdAt: true } },
      historial: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!exp) notFound();

  const comisiones = await prisma.comision.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } });
  const puedeOperar = hasRole(user.role, GESTION_EXPEDIENTES);
  const transicionesPosibles = TRANSICIONES[exp.estado];
  const esConcejal = !!user.concejalId;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/expedientes" className="text-sm text-blue-700 underline">
          ← Mesa de Entradas
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            Expte. {nroExpediente(exp)} — {TIPO_NORMATIVA[exp.tipo]}
          </h1>
          <Badge className={ESTADO_COLOR[exp.estado]}>{ESTADO_EXPEDIENTE[exp.estado]}</Badge>
          {exp.esSensible ? <Badge className="bg-orange-100 text-orange-800">Datos sensibles</Badge> : null}
        </div>
        <p className="mt-1 text-slate-600">{exp.caratula}</p>
      </div>

      {exp.estado === EstadoExpediente.COMUNICADO_DEM && exp.fechaComunicacionDem ? (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          Comunicado al DEM el {fecha(exp.fechaComunicacionDem)}. Plazo de veto (10 días hábiles, Ley 2756) vence el{" "}
          <strong>{fecha(vencimientoVeto(exp.fechaComunicacionDem))}</strong>. Si no hay veto, se promulga automáticamente.
        </div>
      ) : null}
      {exp.promulgacionAutomatica ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Promulgada automáticamente por vencimiento del plazo de veto el {fecha(exp.fechaPromulgacion)}.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Texto del proyecto" subtitle={exp.numeroNorma ?? undefined} />
            <CardBody>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{exp.textoCompleto}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Dictámenes de comisión" />
            <CardBody className="space-y-4">
              {exp.dictamenes.length === 0 ? (
                <p className="text-sm text-slate-500">Sin dictámenes emitidos.</p>
              ) : (
                exp.dictamenes.map((d) => (
                  <div key={d.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{d.comision.nombre}</p>
                      <Badge className="bg-violet-100 text-violet-800">{TIPO_DICTAMEN[d.tipo]}</Badge>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{d.texto}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                      <span className="text-xs text-slate-500">Firmas ({d.firmas.length}):</span>
                      {d.firmas.map((f) => (
                        <span key={f.id} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700" title={`SHA-256: ${f.hashTexto.slice(0, 16)}… · ${fechaHora(f.firmadoEn)}`}>
                          {f.concejal.apellido}
                        </span>
                      ))}
                      {esConcejal && puedeOperar ? (
                        <form action={firmarDictamen.bind(null, d.id, exp.id)}>
                          <button type="submit" className="text-xs text-blue-700 underline">
                            Firmar electrónicamente
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))
              )}

              {puedeOperar && exp.giros.length > 0 ? (
                <form action={emitirDictamen.bind(null, exp.id)} className="space-y-3 rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">Emitir dictamen</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Comisión" required>
                      <select name="comisionId" required className={inputClass}>
                        {exp.giros.map((g) => (
                          <option key={g.comisionId} value={g.comisionId}>
                            {g.comision.nombre}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Tipo de dictamen" required>
                      <select name="tipo" required className={inputClass}>
                        {Object.values(TipoDictamen).map((t) => (
                          <option key={t} value={t}>
                            {TIPO_DICTAMEN[t]}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Texto del dictamen" required>
                    <textarea name="texto" rows={3} required className={inputClass} />
                  </Field>
                  <button type="submit" className={btnPrimary}>
                    Emitir dictamen
                  </button>
                </form>
              ) : null}
            </CardBody>
          </Card>

          {exp.esSensible || exp.versionPublica ? (
            <Card>
              <CardHeader
                title="Versión pública (anonimizada)"
                subtitle="Texto que se muestra en el portal público — Ley 25.326 de Protección de Datos"
              />
              <CardBody>
                {puedeOperar ? (
                  <form action={guardarVersionPublica.bind(null, exp.id)} className="space-y-3">
                    <textarea name="versionPublica" rows={6} defaultValue={exp.versionPublica ?? ""} required className={inputClass} placeholder="Texto sin datos personales sensibles..." />
                    <button type="submit" className={btnSecondary}>
                      Guardar versión pública
                    </button>
                  </form>
                ) : (
                  <p className="whitespace-pre-line text-sm text-slate-600">{exp.versionPublica ?? "Sin versión pública cargada."}</p>
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Datos del expediente" />
            <CardBody>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Origen</dt><dd className="text-right text-slate-900">{exp.bloque?.nombre ?? ORIGEN_EXPEDIENTE[exp.origen]}</dd></div>
                {exp.presentadoPor ? <div className="flex justify-between gap-2"><dt className="text-slate-500">Presentado por</dt><dd className="text-right text-slate-900">{exp.presentadoPor}</dd></div> : null}
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Ingreso</dt><dd className="text-slate-900">{fecha(exp.fechaIngreso)}</dd></div>
                {exp.autores.length > 0 ? (
                  <div className="flex justify-between gap-2"><dt className="text-slate-500">Autores</dt><dd className="text-right text-slate-900">{exp.autores.map((a) => a.concejal.apellido).join(", ")}</dd></div>
                ) : null}
                {exp.numeroNorma ? <div className="flex justify-between gap-2"><dt className="text-slate-500">Norma</dt><dd className="text-right font-medium text-slate-900">{exp.numeroNorma}</dd></div> : null}
              </dl>
              {puedeOperar && (exp.estado === EstadoExpediente.PROMULGADO || exp.estado === EstadoExpediente.PUBLICADO) && !exp.numeroNorma ? (
                <form action={asignarNumeroNorma.bind(null, exp.id)} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  <Field label="Número de norma sancionada">
                    <input name="numeroNorma" required className={inputClass} placeholder="Ej.: Ordenanza N° 3502/2026" />
                  </Field>
                  <button type="submit" className={btnSecondary}>Asignar</button>
                </form>
              ) : null}
            </CardBody>
          </Card>

          {puedeOperar && transicionesPosibles.length > 0 ? (
            <Card>
              <CardHeader title="Cambiar estado" subtitle="Transiciones válidas según el flujo legal" />
              <CardBody>
                <form action={cambiarEstado.bind(null, exp.id)} className="space-y-3">
                  <Field label="Nuevo estado" required>
                    <select name="estado" required className={inputClass}>
                      {transicionesPosibles.map((t) => (
                        <option key={t} value={t}>
                          {ESTADO_EXPEDIENTE[t]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Observación">
                    <input name="observacion" className={inputClass} />
                  </Field>
                  <button type="submit" className={btnPrimary}>
                    Aplicar
                  </button>
                </form>
              </CardBody>
            </Card>
          ) : null}

          {puedeOperar ? (
            <Card>
              <CardHeader title="Girar a comisión" />
              <CardBody>
                <form action={girarAComision.bind(null, exp.id)} className="space-y-3">
                  <select name="comisionId" required className={inputClass}>
                    {comisiones
                      .filter((c) => !exp.giros.some((g) => g.comisionId === c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                  </select>
                  <button type="submit" className={btnSecondary}>
                    Girar
                  </button>
                </form>
                {exp.giros.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-sm text-slate-600">
                    {exp.giros.map((g) => (
                      <li key={g.id}>
                        {g.orden}° giro: {g.comision.nombre} ({fecha(g.fechaGiro)})
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Documentos adjuntos" subtitle="PDF con hash SHA-256 de integridad" />
            <CardBody className="space-y-3">
              {exp.documentos.length === 0 ? (
                <p className="text-sm text-slate-500">Sin documentos.</p>
              ) : (
                <ul className="space-y-2">
                  {exp.documentos.map((d) => (
                    <li key={d.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <a href={`/api/documentos/${d.id}`} className="font-medium text-blue-700 underline">
                        {d.nombre}
                      </a>
                      <p className="text-xs text-slate-500" title={d.hashSha256}>
                        {(d.tamanio / 1024).toFixed(0)} KB · SHA-256 {d.hashSha256.slice(0, 12)}… · {d.publico ? "Público" : "Interno"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {puedeOperar ? (
                <form action={subirDocumento.bind(null, exp.id)} className="space-y-2 border-t border-slate-100 pt-3">
                  <input name="archivo" type="file" accept="application/pdf" required className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm" />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="publico" className="h-4 w-4 rounded border-slate-300" />
                    Visible en el portal público
                  </label>
                  <button type="submit" className={btnSecondary}>
                    Subir PDF (máx. 4 MB)
                  </button>
                </form>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Historial de movimientos" subtitle="Trazabilidad completa" />
            <CardBody>
              <ol className="space-y-3">
                {exp.historial.map((m) => (
                  <li key={m.id} className="border-l-2 border-slate-300 pl-3 text-sm">
                    <p className="font-medium text-slate-900">
                      {m.estadoDesde ? `${ESTADO_EXPEDIENTE[m.estadoDesde]} → ` : ""}
                      {ESTADO_EXPEDIENTE[m.estadoHasta]}
                    </p>
                    <p className="text-xs text-slate-500">
                      {fechaHora(m.createdAt)}
                      {m.usuario ? ` · ${m.usuario}` : ""}
                      {m.observacion ? ` · ${m.observacion}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
