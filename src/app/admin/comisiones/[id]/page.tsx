import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hasRole, GESTION_INSTITUCIONAL, GESTION_EXPEDIENTES } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Badge, Field, inputClass, btnPrimary, btnSecondary, EmptyState } from "@/components/ui";
import { fecha, fechaHora, ROL_COMISION, nroExpediente, ESTADO_EXPEDIENTE, ESTADO_COLOR, TIPO_DICTAMEN } from "@/lib/format";
import { agregarMiembro, quitarMiembro, convocarReunion, cargarActaReunion } from "../actions";
import { RolComision } from "@/generated/prisma/client";

export const metadata = { title: "Comisión" };

export default async function ComisionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const comision = await prisma.comision.findUnique({
    where: { id },
    include: {
      miembros: { include: { concejal: true }, orderBy: { rol: "asc" } },
      giros: {
        include: { expediente: true },
        orderBy: { fechaGiro: "desc" },
      },
      dictamenes: { include: { expediente: true }, orderBy: { fecha: "desc" } },
      reuniones: { orderBy: { fecha: "desc" }, take: 10 },
    },
  });
  if (!comision) notFound();

  const concejales = await prisma.concejal.findMany({ where: { activo: true }, orderBy: { apellido: "asc" } });
  const puedeGestionarMiembros = hasRole(user.role, GESTION_INSTITUCIONAL);
  const puedeOperar = hasRole(user.role, GESTION_EXPEDIENTES);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/comisiones" className="text-sm text-blue-700 underline">
          ← Comisiones
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{comision.nombre}</h1>
        {comision.descripcion ? <p className="text-sm text-slate-500">{comision.descripcion}</p> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Integrantes" />
          <CardBody className="space-y-3">
            {comision.miembros.length === 0 ? (
              <p className="text-sm text-slate-500">Sin integrantes.</p>
            ) : (
              <ul className="space-y-2">
                {comision.miembros.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2">
                    <span className="text-sm text-slate-900">
                      {m.concejal.apellido}, {m.concejal.nombre}
                      <span className="ml-2 text-xs text-slate-500">{ROL_COMISION[m.rol]}</span>
                    </span>
                    {puedeGestionarMiembros ? (
                      <form action={quitarMiembro.bind(null, comision.id, m.id)}>
                        <button type="submit" className="text-xs text-red-600 underline">
                          Quitar
                        </button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {puedeGestionarMiembros ? (
              <form action={agregarMiembro.bind(null, comision.id)} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
                <div className="min-w-44 flex-1">
                  <Field label="Concejal">
                    <select name="concejalId" required className={inputClass}>
                      {concejales.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.apellido}, {c.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="min-w-36">
                  <Field label="Rol">
                    <select name="rol" required className={inputClass}>
                      {Object.values(RolComision).map((r) => (
                        <option key={r} value={r}>
                          {ROL_COMISION[r]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <button type="submit" className={btnSecondary}>
                  Agregar
                </button>
              </form>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Expedientes girados" />
          {comision.giros.length === 0 ? (
            <EmptyState>No hay expedientes girados a esta comisión.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {comision.giros.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/expedientes/${g.expediente.id}`} className="block truncate text-sm font-medium text-slate-900 hover:underline">
                      Expte. {nroExpediente(g.expediente)} — {g.expediente.caratula}
                    </Link>
                    <p className="text-xs text-slate-500">Girado el {fecha(g.fechaGiro)}</p>
                  </div>
                  <Badge className={ESTADO_COLOR[g.expediente.estado]}>{ESTADO_EXPEDIENTE[g.expediente.estado]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Dictámenes emitidos" />
          {comision.dictamenes.length === 0 ? (
            <EmptyState>Sin dictámenes.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {comision.dictamenes.map((d) => (
                <li key={d.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/admin/expedientes/${d.expediente.id}`} className="text-sm font-medium text-slate-900 hover:underline">
                      Expte. {nroExpediente(d.expediente)}
                    </Link>
                    <Badge className="bg-violet-100 text-violet-800">{TIPO_DICTAMEN[d.tipo]}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{d.texto}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Reuniones" />
          <CardBody className="space-y-4">
            {puedeOperar ? (
              <form action={convocarReunion.bind(null, comision.id)} className="space-y-3 rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">Convocar reunión</p>
                <Field label="Fecha y hora" required>
                  <input name="fecha" type="datetime-local" required className={inputClass} />
                </Field>
                <Field label="Orden del día" required>
                  <textarea name="ordenDelDia" rows={3} required className={inputClass} />
                </Field>
                <button type="submit" className={btnPrimary}>
                  Convocar
                </button>
              </form>
            ) : null}
            {comision.reuniones.length === 0 ? (
              <p className="text-sm text-slate-500">Sin reuniones registradas.</p>
            ) : (
              <ul className="space-y-3">
                {comision.reuniones.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm font-medium text-slate-900">{fechaHora(r.fecha)}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{r.ordenDelDia}</p>
                    {r.acta ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-blue-700">Ver acta</summary>
                        <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{r.acta}</p>
                      </details>
                    ) : puedeOperar ? (
                      <form action={cargarActaReunion.bind(null, r.id, comision.id)} className="mt-2 space-y-2">
                        <textarea name="acta" rows={2} placeholder="Cargar acta de la reunión..." className={inputClass} />
                        <button type="submit" className="text-sm text-blue-700 underline">
                          Guardar acta
                        </button>
                      </form>
                    ) : null}
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
