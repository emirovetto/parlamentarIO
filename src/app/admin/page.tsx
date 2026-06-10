import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardHeader, CardBody, StatCard, Badge, EmptyState } from "@/components/ui";
import { nroExpediente, fecha, ESTADO_EXPEDIENTE, ESTADO_COLOR, TIPO_NORMATIVA, TIPO_SESION, fechaHora } from "@/lib/format";

export const metadata = { title: "Panel general" };

export default async function AdminDashboard() {
  await requireUser();

  const [totalExpedientes, enComision, conDictamen, proximasSesiones, ultimosExpedientes, bancasPendientes] =
    await Promise.all([
      prisma.expediente.count(),
      prisma.expediente.count({ where: { estado: "EN_COMISION" } }),
      prisma.expediente.count({ where: { estado: "CON_DICTAMEN" } }),
      prisma.sesion.findMany({
        where: { estado: { in: ["PROGRAMADA", "EN_CURSO"] } },
        orderBy: { fecha: "asc" },
        take: 3,
      }),
      prisma.expediente.findMany({
        orderBy: { fechaIngreso: "desc" },
        take: 6,
        include: { bloque: true },
      }),
      prisma.solicitudBanca.count({ where: { estado: "PENDIENTE" } }),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Panel general</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Expedientes totales" value={totalExpedientes} />
        <StatCard label="En comisión" value={enComision} />
        <StatCard label="Con dictamen" value={conDictamen} hint="Listos para Orden del Día" />
        <StatCard label="Bancas ciudadanas pendientes" value={bancasPendientes} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Últimos expedientes"
            action={
              <Link href="/admin/expedientes" className="text-sm text-blue-700 underline">
                Ver todos
              </Link>
            }
          />
          {ultimosExpedientes.length === 0 ? (
            <EmptyState>No hay expedientes cargados.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {ultimosExpedientes.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/expedientes/${e.id}`}
                      className="block truncate text-sm font-medium text-slate-900 hover:underline"
                    >
                      Expte. {nroExpediente(e)} — {e.caratula}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {TIPO_NORMATIVA[e.tipo]} · Ingreso {fecha(e.fechaIngreso)}
                      {e.bloque ? ` · ${e.bloque.nombre}` : ""}
                    </p>
                  </div>
                  <Badge className={ESTADO_COLOR[e.estado]}>{ESTADO_EXPEDIENTE[e.estado]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Próximas sesiones"
            action={
              <Link href="/admin/sesiones" className="text-sm text-blue-700 underline">
                Gestionar
              </Link>
            }
          />
          {proximasSesiones.length === 0 ? (
            <EmptyState>No hay sesiones programadas.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {proximasSesiones.map((s) => (
                <li key={s.id} className="px-5 py-3">
                  <Link href={`/admin/sesiones/${s.id}`} className="text-sm font-medium text-slate-900 hover:underline">
                    Sesión {TIPO_SESION[s.tipo]} N° {s.numero}/{s.anio}
                  </Link>
                  <p className="text-xs text-slate-500">{fechaHora(s.fecha)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
