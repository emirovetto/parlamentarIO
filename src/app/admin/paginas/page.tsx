import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_PORTAL } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Field, inputClass, btnPrimary, Badge } from "@/components/ui";
import { guardarPagina } from "./actions";

export const metadata = { title: "Páginas institucionales" };

export default async function PaginasAdminPage() {
  await requireRole(GESTION_PORTAL);
  const paginas = await prisma.paginaInstitucional.findMany({ orderBy: { orden: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Páginas institucionales</h1>
        <p className="mt-1 text-sm text-slate-500">El Concejo, contacto, reglamento interno y otras secciones editables del portal.</p>
      </div>

      <Card>
        <CardHeader title="Nueva página" />
        <CardBody>
          <form action={guardarPagina.bind(null, null)} className="grid gap-3">
            <Field label="Título" required>
              <input name="titulo" required className={inputClass} />
            </Field>
            <Field label="Slug URL (opcional)">
              <input name="slug" placeholder="el-concejo" className={inputClass} />
            </Field>
            <Field label="Contenido" required>
              <textarea name="contenido" required rows={8} className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="publicada" defaultChecked className="rounded" />
              Publicada
            </label>
            <button type="submit" className={btnPrimary}>Crear página</button>
          </form>
        </CardBody>
      </Card>

      {paginas.map((p) => (
        <Card key={p.id}>
          <CardHeader
            title={p.titulo}
            action={
              p.publicada ? (
                <a href={`/institucional/${p.slug}`} target="_blank" className="text-sm text-blue-700 underline">Ver pública</a>
              ) : (
                <Badge className="bg-slate-100 text-slate-600">Borrador</Badge>
              )
            }
          />
          <CardBody>
            <form action={guardarPagina.bind(null, p.id)} className="grid gap-3">
              <Field label="Título" required>
                <input name="titulo" required defaultValue={p.titulo} className={inputClass} />
              </Field>
              <Field label="Slug">
                <input name="slug" defaultValue={p.slug} className={inputClass} />
              </Field>
              <Field label="Orden en menú">
                <input name="orden" type="number" defaultValue={p.orden} className={inputClass} />
              </Field>
              <Field label="Contenido" required>
                <textarea name="contenido" required rows={10} defaultValue={p.contenido} className={inputClass} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="publicada" defaultChecked={p.publicada} className="rounded" />
                Publicada
              </label>
              <button type="submit" className={btnPrimary}>Guardar</button>
            </form>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
