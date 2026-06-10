import { requireRole } from "@/lib/session";
import { GESTION_PORTAL } from "@/lib/rbac";
import { Card, CardHeader, CardBody } from "@/components/ui";
import { NoticiaForm } from "../NoticiaForm";
import { crearNoticia } from "../actions";

export const metadata = { title: "Nueva noticia" };

export default async function NuevaNoticiaPage() {
  await requireRole(GESTION_PORTAL);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Nueva noticia</h1>
      <Card>
        <CardHeader title="Contenido" />
        <CardBody>
          <NoticiaForm action={crearNoticia} />
        </CardBody>
      </Card>
    </div>
  );
}
