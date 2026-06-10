import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_EXPEDIENTES } from "@/lib/rbac";
import { promulgarVencidos } from "@/lib/jobs";
import { Card, CardHeader, Table, Badge, ButtonLink, inputClass, EmptyState } from "@/components/ui";
import { nroExpediente, fecha, ESTADO_EXPEDIENTE, ESTADO_COLOR, TIPO_NORMATIVA, ORIGEN_EXPEDIENTE } from "@/lib/format";
import { EstadoExpediente, TipoNormativa, type Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Mesa de Entradas" };

export default async function ExpedientesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; tipo?: string; q?: string }>;
}) {
  await requireRole(GESTION_EXPEDIENTES);
  await promulgarVencidos();

  const { estado, tipo, q } = await searchParams;

  const where: Prisma.ExpedienteWhereInput = {};
  if (estado && estado in EstadoExpediente) where.estado = estado as EstadoExpediente;
  if (tipo && tipo in TipoNormativa) where.tipo = tipo as TipoNormativa;
  if (q) where.caratula = { contains: q, mode: "insensitive" };

  const expedientes = await prisma.expediente.findMany({
    where,
    orderBy: [{ anio: "desc" }, { numero: "desc" }],
    include: { bloque: true, giros: { include: { comision: true } } },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Mesa de Entradas</h1>
        <ButtonLink href="/admin/expedientes/nuevo">Nuevo expediente</ButtonLink>
      </div>

      <Card>
        <CardHeader title="Expedientes" subtitle="Filtrá por estado, tipo o carátula" />
        <form method="get" className="flex flex-wrap gap-3 border-b border-slate-100 px-5 py-4">
          <input name="q" defaultValue={q} placeholder="Buscar por carátula..." className={`${inputClass} max-w-xs`} />
          <select name="estado" defaultValue={estado ?? ""} className={`${inputClass} max-w-44`}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_EXPEDIENTE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select name="tipo" defaultValue={tipo ?? ""} className={`${inputClass} max-w-44`}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPO_NORMATIVA).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Filtrar
          </button>
        </form>
        {expedientes.length === 0 ? (
          <EmptyState>No se encontraron expedientes con esos criterios.</EmptyState>
        ) : (
          <Table headers={["Expediente", "Tipo", "Origen", "Comisiones", "Ingreso", "Estado"]}>
            {expedientes.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="max-w-md px-4 py-3">
                  <Link href={`/admin/expedientes/${e.id}`} className="font-medium text-slate-900 hover:underline">
                    {nroExpediente(e)}
                  </Link>
                  <p className="truncate text-xs text-slate-500">{e.caratula}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{TIPO_NORMATIVA[e.tipo]}</td>
                <td className="px-4 py-3 text-slate-600">{e.bloque?.nombre ?? ORIGEN_EXPEDIENTE[e.origen]}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {e.giros.map((g) => g.comision.nombre).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{fecha(e.fechaIngreso)}</td>
                <td className="px-4 py-3">
                  <Badge className={ESTADO_COLOR[e.estado]}>{ESTADO_EXPEDIENTE[e.estado]}</Badge>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
