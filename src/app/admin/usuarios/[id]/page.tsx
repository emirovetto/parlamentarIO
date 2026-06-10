import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_USUARIOS } from "@/lib/rbac";
import { Card, CardHeader, CardBody } from "@/components/ui";
import { UsuarioForm } from "../UsuarioForm";
import { actualizarUsuario } from "../actions";

export const metadata = { title: "Editar usuario" };

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(GESTION_USUARIOS);
  const { id } = await params;

  const [usuario, bloques, concejales] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { concejal: { select: { id: true } } } }),
    prisma.bloque.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.concejal.findMany({ where: { activo: true }, orderBy: { apellido: "asc" }, select: { id: true, nombre: true, apellido: true, userId: true } }),
  ]);
  if (!usuario) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Editar usuario: {usuario.nombre}</h1>
      <Card>
        <CardHeader title="Datos de la cuenta" />
        <CardBody>
          <UsuarioForm
            action={actualizarUsuario.bind(null, id)}
            bloques={bloques}
            concejales={concejales}
            usuario={usuario}
          />
        </CardBody>
      </Card>
    </div>
  );
}
