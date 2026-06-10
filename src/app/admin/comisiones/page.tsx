import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hasRole, GESTION_INSTITUCIONAL } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Field, inputClass, btnPrimary } from "@/components/ui";
import { crearComision } from "./actions";

export const metadata = { title: "Comisiones" };

export default async function ComisionesPage() {
  const user = await requireUser();
  const comisiones = await prisma.comision.findMany({
    orderBy: { nombre: "asc" },
    include: {
      miembros: { include: { concejal: true } },
      _count: { select: { giros: true, dictamenes: true } },
    },
  });
  const puedeGestionar = hasRole(user.role, GESTION_INSTITUCIONAL);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Comisiones permanentes</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {comisiones.map((c) => (
            <Card key={c.id}>
              <CardHeader
                title={
                  <Link href={`/admin/comisiones/${c.id}`} className="hover:underline">
                    {c.nombre}
                  </Link>
                }
                subtitle={c.descripcion}
                action={
                  <span className="text-xs text-slate-500">
                    {c._count.giros} expedientes · {c._count.dictamenes} dictámenes
                  </span>
                }
              />
              <CardBody>
                <p className="text-sm text-slate-600">
                  {c.miembros.length === 0
                    ? "Sin miembros asignados."
                    : c.miembros.map((m) => `${m.concejal.apellido}`).join(" · ")}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>

        {puedeGestionar ? (
          <Card className="h-fit">
            <CardHeader title="Nueva comisión" />
            <CardBody>
              <form action={crearComision} className="space-y-4">
                <Field label="Nombre" required>
                  <input name="nombre" required minLength={3} className={inputClass} />
                </Field>
                <Field label="Descripción">
                  <textarea name="descripcion" rows={3} className={inputClass} />
                </Field>
                <button type="submit" className={btnPrimary}>
                  Crear comisión
                </button>
              </form>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
