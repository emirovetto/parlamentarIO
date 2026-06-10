import { prisma } from "@/lib/prisma";
import { fecha, CATEGORIA_TRANSPARENCIA } from "@/lib/format";
import { CategoriaTransparencia } from "@/generated/prisma/client";

export const metadata = { title: "Transparencia" };
export const revalidate = 300;

export default async function TransparenciaPage() {
  const documentos = await prisma.documento.findMany({
    where: { publico: true, categoria: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { id: true, titulo: true, nombre: true, categoria: true, createdAt: true, hashSha256: true },
  });

  const categorias = Object.values(CategoriaTransparencia);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Transparencia activa</h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          Publicación proactiva de información pública del Concejo: Boletín Oficial Municipal, declaraciones
          juradas de los concejales, escalas salariales y ejecución presupuestaria.
        </p>
      </div>

      {categorias.map((cat) => {
        const docs = documentos.filter((d) => d.categoria === cat);
        return (
          <section key={cat} aria-labelledby={`cat-${cat}`}>
            <h2 id={`cat-${cat}`} className="text-lg font-semibold text-slate-900">
              {CATEGORIA_TRANSPARENCIA[cat]}
            </h2>
            {docs.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No hay documentos publicados en esta categoría.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {docs.map((d) => (
                  <li key={d.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <a href={`/api/documentos/${d.id}`} className="font-medium text-blue-700 underline">
                      {d.titulo ?? d.nombre}
                    </a>
                    <p className="mt-0.5 text-xs text-slate-400" title={d.hashSha256}>
                      Publicado el {fecha(d.createdAt)} · Integridad SHA-256: {d.hashSha256.slice(0, 16)}…
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
