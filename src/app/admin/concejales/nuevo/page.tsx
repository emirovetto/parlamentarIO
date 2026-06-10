import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_INSTITUCIONAL } from "@/lib/rbac";
import { Card, CardHeader, CardBody } from "@/components/ui";
import { ConcejalForm } from "../ConcejalForm";
import { crearConcejal } from "../actions";

export const metadata = { title: "Nuevo concejal" };

export default async function NuevoConcejalPage() {
  await requireRole(GESTION_INSTITUCIONAL);
  const bloques = await prisma.bloque.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Nuevo concejal</h1>
      <Card>
        <CardHeader title="Datos del concejal" subtitle="El mandato determina la habilitación para votar en sesiones" />
        <CardBody>
          <ConcejalForm action={crearConcejal} bloques={bloques} conEmail />
        </CardBody>
      </Card>
    </div>
  );
}
