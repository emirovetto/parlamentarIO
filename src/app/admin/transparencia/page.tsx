import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_INSTITUCIONAL } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Table, Field, inputClass, btnPrimary } from "@/components/ui";
import { fecha, CATEGORIA_TRANSPARENCIA } from "@/lib/format";
import { publicarDocumentoTransparencia, despublicarDocumento } from "./actions";
import { CategoriaTransparencia } from "@/generated/prisma/client";

export const metadata = { title: "Transparencia" };

export default async function TransparenciaAdminPage() {
  await requireRole(GESTION_INSTITUCIONAL);
  const documentos = await prisma.documento.findMany({
    where: { categoria: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { id: true, titulo: true, nombre: true, categoria: true, publico: true, createdAt: true, tamanio: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Transparencia activa</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Documentos publicados" subtitle="Boletín Oficial, DDJJ, salarios y presupuesto" />
          <Table headers={["Documento", "Categoría", "Fecha", "Estado", ""]}>
            {documentos.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3">
                  <a href={`/api/documentos/${d.id}`} className="font-medium text-blue-700 underline">
                    {d.titulo ?? d.nombre}
                  </a>
                  <p className="text-xs text-slate-400">{(d.tamanio / 1024).toFixed(0)} KB</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{d.categoria ? CATEGORIA_TRANSPARENCIA[d.categoria] : "—"}</td>
                <td className="px-4 py-3 text-slate-600">{fecha(d.createdAt)}</td>
                <td className="px-4 py-3 text-slate-600">{d.publico ? "Público" : "Despublicado"}</td>
                <td className="px-4 py-3">
                  {d.publico ? (
                    <form action={despublicarDocumento.bind(null, d.id)}>
                      <button type="submit" className="text-sm text-red-600 underline">
                        Despublicar
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Publicar documento" />
          <CardBody>
            <form action={publicarDocumentoTransparencia} className="space-y-4">
              <Field label="Título" required>
                <input name="titulo" required minLength={3} className={inputClass} placeholder="Ej.: Boletín Oficial — Junio 2026" />
              </Field>
              <Field label="Categoría" required>
                <select name="categoria" required className={inputClass}>
                  {Object.values(CategoriaTransparencia).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIA_TRANSPARENCIA[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Archivo PDF (máx. 4 MB)" required>
                <input name="archivo" type="file" accept="application/pdf" required className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm" />
              </Field>
              <button type="submit" className={btnPrimary}>
                Publicar
              </button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
