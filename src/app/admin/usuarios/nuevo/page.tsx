import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_USUARIOS } from "@/lib/rbac";
import { Card, CardHeader, CardBody } from "@/components/ui";
import { UsuarioForm } from "../UsuarioForm";
import { crearUsuario } from "../actions";

export const metadata = { title: "Nuevo usuario" };

export default async function NuevoUsuarioPage() {
  await requireRole(GESTION_USUARIOS);
  const [bloques, concejales] = await Promise.all([
    prisma.bloque.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.concejal.findMany({ where: { activo: true }, orderBy: { apellido: "asc" }, select: { id: true, nombre: true, apellido: true, userId: true } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Nuevo usuario</h1>
      <Card>
        <CardHeader
          title="Alta de usuario"
          subtitle="Creá cuentas para secretaría parlamentaria, concejales (con banca para votar), secretarios de bloque, etc."
        />
        <CardBody>
          <UsuarioForm action={crearUsuario} bloques={bloques} concejales={concejales} esNuevo />
        </CardBody>
      </Card>
    </div>
  );
}
