import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { CATEGORIA_NOTICIA, fecha } from "@/lib/format";
import { imagenUrl } from "@/lib/imagenes";

export const metadata = { title: "Noticias" };
export const revalidate = 120;

export default async function NoticiasPage() {
  const noticias = await prisma.noticia.findMany({
    where: { publicada: true },
    orderBy: { publicadaEn: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Noticias</h1>
        <p className="mt-2 text-slate-600">Novedades del Concejo Deliberante y la actividad legislativa.</p>
      </div>

      {noticias.length === 0 ? (
        <p className="text-slate-500">No hay noticias publicadas.</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2">
          {noticias.map((n) => {
            const img = imagenUrl(n.imagenId);
            return (
              <li key={n.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                {img ? (
                  <div className="relative h-44 w-full bg-slate-100">
                    <Image src={img} alt="" fill className="object-cover" unoptimized />
                  </div>
                ) : null}
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-slate-100 text-slate-600">{CATEGORIA_NOTICIA[n.categoria]}</Badge>
                    <span className="text-xs text-slate-400">{fecha(n.publicadaEn ?? n.createdAt)}</span>
                  </div>
                  <Link href={`/noticias/${n.slug}`} className="mt-2 block text-lg font-semibold text-slate-900 hover:text-blue-700 hover:underline">
                    {n.titulo}
                  </Link>
                  {n.resumen ? <p className="mt-2 line-clamp-3 text-sm text-slate-600">{n.resumen}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
