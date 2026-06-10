import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_PORTAL } from "@/lib/rbac";
import { Card, CardHeader, Table, Badge, ButtonLink } from "@/components/ui";
import { CATEGORIA_NOTICIA, fecha } from "@/lib/format";
import { eliminarNoticia } from "./actions";

export const metadata = { title: "Noticias" };

export default async function NoticiasAdminPage() {
  await requireRole(GESTION_PORTAL);
  const noticias = await prisma.noticia.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Noticias del portal</h1>
        <ButtonLink href="/admin/noticias/nuevo">Nueva noticia</ButtonLink>
      </div>
      <Card>
        <CardHeader title="Publicaciones" />
        <Table headers={["Título", "Categoría", "Estado", "Fecha", ""]}>
          {noticias.map((n) => (
            <tr key={n.id}>
              <td className="px-4 py-3">
                <Link href={`/admin/noticias/${n.id}`} className="font-medium text-slate-900 hover:underline">{n.titulo}</Link>
                {n.destacada ? <Badge className="ml-2 bg-amber-100 text-amber-800">Destacada</Badge> : null}
              </td>
              <td className="px-4 py-3 text-slate-600">{CATEGORIA_NOTICIA[n.categoria]}</td>
              <td className="px-4 py-3">
                <Badge className={n.publicada ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}>
                  {n.publicada ? "Publicada" : "Borrador"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-slate-500">{fecha(n.publicadaEn ?? n.createdAt)}</td>
              <td className="px-4 py-3">
                {n.publicada ? (
                  <Link href={`/noticias/${n.slug}`} target="_blank" className="mr-3 text-sm text-blue-700 underline">Ver</Link>
                ) : null}
                <form action={eliminarNoticia.bind(null, n.id)} className="inline">
                  <button type="submit" className="text-sm text-red-600 underline">Eliminar</button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
