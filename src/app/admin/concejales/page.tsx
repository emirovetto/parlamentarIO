import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_INSTITUCIONAL } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Table, Badge, ButtonLink, Field, btnSecondary } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { BloqueLogo } from "@/components/BloqueLogo";
import { imagenUrl } from "@/lib/imagenes";
import { fecha, CARGO_AUTORIDAD } from "@/lib/format";
import { alternarConcejal, asignarAutoridad } from "./actions";
import { CargoAutoridad } from "@/generated/prisma/client";

export const metadata = { title: "Concejales" };

export default async function ConcejalesPage() {
  await requireRole(GESTION_INSTITUCIONAL);
  const [concejales, autoridades] = await Promise.all([
    prisma.concejal.findMany({
      orderBy: [{ apellido: "asc" }],
      include: { bloque: true, user: { select: { email: true } } },
    }),
    prisma.autoridad.findMany({
      where: { hasta: null },
      include: { concejal: true },
      orderBy: { cargo: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Concejales</h1>
        <ButtonLink href="/admin/concejales/nuevo">Nuevo concejal</ButtonLink>
      </div>

      <Card>
        <CardHeader title="Cuerpo de concejales" subtitle="Mandatos vigentes e históricos" />
        <Table headers={["Concejal", "Bloque", "Contacto", "Mandato", "Usuario", "Estado", ""]}>
          {concejales.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={imagenUrl(c.fotoId) ?? c.fotoUrl}
                    nombre={c.nombre}
                    apellido={c.apellido}
                    size="sm"
                  />
                  <div>
                    <Link href={`/admin/concejales/${c.id}`} className="font-medium text-slate-900 hover:underline">
                      {c.apellido}, {c.nombre}
                    </Link>
                    <p className="text-xs text-slate-500">{c.partido}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2 text-slate-600">
                  <BloqueLogo nombre={c.bloque.nombre} color={c.bloque.color} logoSrc={imagenUrl(c.bloque.logoId)} size={20} />
                  {c.bloque.nombre}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {c.email ?? c.user?.email ?? "—"}
                {c.telefono ? <><br />{c.telefono}</> : null}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {fecha(c.mandatoInicio)} — {fecha(c.mandatoFin)}
              </td>
              <td className="px-4 py-3 text-slate-600">{c.user?.email ?? "—"}</td>
              <td className="px-4 py-3">
                <Badge className={c.activo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}>
                  {c.activo ? "Activo" : "Inactivo"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <form action={alternarConcejal.bind(null, c.id)}>
                  <button type="submit" className="text-sm text-blue-700 underline">
                    {c.activo ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Autoridades vigentes" subtitle="Organigrama del Concejo" />
          <CardBody>
            {autoridades.length === 0 ? (
              <p className="text-sm text-slate-500">Sin autoridades asignadas.</p>
            ) : (
              <ul className="space-y-2">
                {autoridades.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2">
                    <span className="text-sm font-medium text-slate-900">{CARGO_AUTORIDAD[a.cargo]}</span>
                    <span className="text-sm text-slate-600">
                      {a.concejal.apellido}, {a.concejal.nombre}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Asignar autoridad" subtitle="Cierra automáticamente el mandato anterior del cargo" />
          <CardBody>
            <form action={asignarAutoridad} className="space-y-4">
              <Field label="Cargo" required>
                <select name="cargo" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  {Object.values(CargoAutoridad).map((cargo) => (
                    <option key={cargo} value={cargo}>
                      {CARGO_AUTORIDAD[cargo]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Concejal" required>
                <select name="concejalId" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  {concejales
                    .filter((c) => c.activo)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.apellido}, {c.nombre}
                      </option>
                    ))}
                </select>
              </Field>
              <button type="submit" className={btnSecondary}>
                Asignar
              </button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
