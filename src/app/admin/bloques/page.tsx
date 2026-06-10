import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_INSTITUCIONAL } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Table, Badge, Field, inputClass, btnPrimary, btnSecondary } from "@/components/ui";
import { crearBloque, alternarBloque } from "./actions";

export const metadata = { title: "Bloques políticos" };

export default async function BloquesPage() {
  await requireRole(GESTION_INSTITUCIONAL);
  const bloques = await prisma.bloque.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { concejales: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Bloques políticos</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Bloques registrados" />
          <Table headers={["Bloque", "Partido", "Concejales", "Estado", ""]}>
            {bloques.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: b.color }} aria-hidden />
                    {b.nombre}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{b.partido}</td>
                <td className="px-4 py-3 text-slate-600">{b._count.concejales}</td>
                <td className="px-4 py-3">
                  <Badge className={b.activo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}>
                    {b.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <form action={alternarBloque.bind(null, b.id)}>
                    <button type="submit" className="text-sm text-blue-700 underline">
                      {b.activo ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardHeader title="Nuevo bloque" />
          <CardBody>
            <form action={crearBloque} className="space-y-4">
              <Field label="Nombre del bloque" required>
                <input name="nombre" required minLength={2} className={inputClass} />
              </Field>
              <Field label="Partido político" required>
                <input name="partido" required minLength={2} className={inputClass} />
              </Field>
              <Field label="Color identificatorio" required>
                <input name="color" type="color" defaultValue="#2563eb" className="h-10 w-20 cursor-pointer rounded border border-slate-300" />
              </Field>
              <button type="submit" className={btnPrimary}>
                Crear bloque
              </button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
