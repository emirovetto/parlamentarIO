import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_SESIONES } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Table, Badge, Field, inputClass, btnPrimary } from "@/components/ui";
import { fechaHora, TIPO_SESION, ESTADO_SESION } from "@/lib/format";
import { crearSesion } from "./actions";
import { TipoSesion } from "@/generated/prisma/client";

export const metadata = { title: "Sesiones" };

const ESTADO_SESION_COLOR: Record<string, string> = {
  PROGRAMADA: "bg-blue-100 text-blue-800",
  EN_CURSO: "bg-green-100 text-green-800",
  FINALIZADA: "bg-slate-200 text-slate-700",
  CANCELADA: "bg-red-100 text-red-800",
};

export default async function SesionesPage() {
  await requireRole(GESTION_SESIONES);
  const sesiones = await prisma.sesion.findMany({
    orderBy: [{ anio: "desc" }, { numero: "desc" }],
    include: { _count: { select: { puntos: true, votaciones: true } } },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Sesiones</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Sesiones del Concejo" />
          <Table headers={["Sesión", "Fecha", "Puntos", "Votaciones", "Estado", ""]}>
            {sesiones.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/sesiones/${s.id}`} className="font-medium text-slate-900 hover:underline">
                    N° {s.numero}/{s.anio} — {TIPO_SESION[s.tipo]}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{fechaHora(s.fecha)}</td>
                <td className="px-4 py-3 text-slate-600">{s._count.puntos}</td>
                <td className="px-4 py-3 text-slate-600">{s._count.votaciones}</td>
                <td className="px-4 py-3">
                  <Badge className={ESTADO_SESION_COLOR[s.estado]}>{ESTADO_SESION[s.estado]}</Badge>
                </td>
                <td className="px-4 py-3">
                  {s.estado === "EN_CURSO" ? (
                    <Link href={`/admin/sesiones/${s.id}/vivo`} className="text-sm font-medium text-green-700 underline">
                      Recinto en vivo
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Convocar sesión" subtitle="La numeración es automática por año" />
          <CardBody>
            <form action={crearSesion} className="space-y-4">
              <Field label="Tipo de sesión" required>
                <select name="tipo" required className={inputClass}>
                  {Object.values(TipoSesion).map((t) => (
                    <option key={t} value={t}>
                      {TIPO_SESION[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha y hora" required>
                <input name="fecha" type="datetime-local" required className={inputClass} />
              </Field>
              <button type="submit" className={btnPrimary}>
                Convocar
              </button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
