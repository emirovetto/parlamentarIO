import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card, CardHeader, Table } from "@/components/ui";
import { fechaHora } from "@/lib/format";
import { Role } from "@/generated/prisma/client";

export const metadata = { title: "Auditoría" };

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  await requireRole([Role.ADMIN, Role.PRESIDENTE]);
  const { pagina } = await searchParams;
  const page = Math.max(1, Number(pagina) || 1);
  const porPagina = 50;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { nombre: true, email: true } } },
      skip: (page - 1) * porPagina,
      take: porPagina,
    }),
    prisma.auditLog.count(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Registro de auditoría</h1>
      <Card>
        <CardHeader
          title="Trazabilidad del sistema"
          subtitle={`Registro inmutable de ${total} acciones. Página ${page} de ${Math.max(1, Math.ceil(total / porPagina))}.`}
        />
        <Table headers={["Fecha y hora", "Usuario", "Acción", "Entidad", "Detalle"]}>
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">{fechaHora(l.createdAt)}</td>
              <td className="px-4 py-2 text-slate-700">{l.user?.nombre ?? "Sistema"}</td>
              <td className="px-4 py-2 font-mono text-xs text-slate-900">{l.accion}</td>
              <td className="px-4 py-2 text-slate-600">
                {l.entidad}
                {l.entidadId ? <span className="text-xs text-slate-400"> #{l.entidadId.slice(-6)}</span> : null}
              </td>
              <td className="max-w-xs truncate px-4 py-2 text-xs text-slate-500">
                {l.datos ? JSON.stringify(l.datos) : "—"}
              </td>
            </tr>
          ))}
        </Table>
        <div className="flex justify-between px-5 py-3 text-sm">
          {page > 1 ? (
            <a href={`?pagina=${page - 1}`} className="text-blue-700 underline">← Anterior</a>
          ) : <span />}
          {page * porPagina < total ? (
            <a href={`?pagina=${page + 1}`} className="text-blue-700 underline">Siguiente →</a>
          ) : <span />}
        </div>
      </Card>
    </div>
  );
}
