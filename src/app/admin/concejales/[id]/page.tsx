import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_INSTITUCIONAL } from "@/lib/rbac";
import { Card, CardHeader, CardBody } from "@/components/ui";
import { ConcejalForm } from "../ConcejalForm";
import { actualizarConcejal } from "../actions";

export const metadata = { title: "Editar concejal" };

export default async function EditarConcejalPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(GESTION_INSTITUCIONAL);
  const { id } = await params;
  const [concejal, bloques] = await Promise.all([
    prisma.concejal.findUnique({ where: { id } }),
    prisma.bloque.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);
  if (!concejal) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">
        Editar concejal: {concejal.apellido}, {concejal.nombre}
      </h1>
      <Card>
        <CardHeader title="Datos del concejal" />
        <CardBody>
          <ConcejalForm action={actualizarConcejal.bind(null, id)} bloques={bloques} concejal={concejal} />
        </CardBody>
      </Card>
    </div>
  );
}
