import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_USUARIOS, ROLE_LABELS } from "@/lib/rbac";
import { Card, CardHeader, Table, Badge, ButtonLink } from "@/components/ui";
import { alternarUsuario } from "./actions";

export const metadata = { title: "Usuarios del sistema" };

export default async function UsuariosPage() {
  await requireRole(GESTION_USUARIOS);
  const usuarios = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { nombre: "asc" }],
    include: {
      bloque: true,
      concejal: { select: { id: true, apellido: true, nombre: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Usuarios del sistema</h1>
          <p className="mt-1 text-sm text-slate-500">
            Secretaría parlamentaria, concejales, empleados de comisión y demás roles con acceso al backoffice.
          </p>
        </div>
        <ButtonLink href="/admin/usuarios/nuevo">Nuevo usuario</ButtonLink>
      </div>

      <Card>
        <CardHeader title="Cuentas registradas" subtitle={`${usuarios.length} usuarios`} />
        <Table headers={["Usuario", "Rol", "Bloque", "Concejal vinculado", "Estado", ""]}>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3">
                <Link href={`/admin/usuarios/${u.id}`} className="font-medium text-slate-900 hover:underline">
                  {u.nombre}
                </Link>
                <p className="text-xs text-slate-500">{u.email}</p>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{ROLE_LABELS[u.role]}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{u.bloque?.nombre ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {u.concejal ? `${u.concejal.apellido}, ${u.concejal.nombre}` : "—"}
              </td>
              <td className="px-4 py-3">
                <Badge className={u.activo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}>
                  {u.activo ? "Activo" : "Inactivo"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <form action={alternarUsuario.bind(null, u.id)}>
                  <button type="submit" className="text-sm text-blue-700 underline">
                    {u.activo ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
