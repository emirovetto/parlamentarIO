import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_PORTAL } from "@/lib/rbac";
import { Card, CardHeader, CardBody } from "@/components/ui";
import { NoticiaForm } from "../NoticiaForm";
import { actualizarNoticia } from "../actions";

export const metadata = { title: "Editar noticia" };

export default async function EditarNoticiaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(GESTION_PORTAL);
  const { id } = await params;
  const noticia = await prisma.noticia.findUnique({ where: { id } });
  if (!noticia) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Editar noticia</h1>
      <Card>
        <CardHeader title={noticia.titulo} />
        <CardBody>
          <NoticiaForm action={actualizarNoticia.bind(null, id)} noticia={noticia} />
        </CardBody>
      </Card>
    </div>
  );
}
