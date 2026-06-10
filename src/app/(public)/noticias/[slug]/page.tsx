import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { CATEGORIA_NOTICIA, fecha } from "@/lib/format";
import { imagenUrl } from "@/lib/imagenes";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const n = await prisma.noticia.findFirst({ where: { slug, publicada: true } });
  return { title: n?.titulo ?? "Noticia" };
}

export default async function NoticiaDetallePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const noticia = await prisma.noticia.findFirst({ where: { slug, publicada: true } });
  if (!noticia) notFound();
  const img = imagenUrl(noticia.imagenId);

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link href="/noticias" className="text-sm text-blue-700 underline">← Noticias</Link>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-slate-100 text-slate-600">{CATEGORIA_NOTICIA[noticia.categoria]}</Badge>
        <span className="text-sm text-slate-500">{fecha(noticia.publicadaEn ?? noticia.createdAt)}</span>
      </div>
      <h1 className="text-3xl font-bold text-slate-900">{noticia.titulo}</h1>
      {noticia.resumen ? <p className="text-lg text-slate-600">{noticia.resumen}</p> : null}
      {img ? (
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-100">
          <Image src={img} alt="" fill className="object-cover" unoptimized />
        </div>
      ) : null}
      <div className="prose prose-slate max-w-none whitespace-pre-line text-slate-700">{noticia.cuerpo}</div>
    </article>
  );
}
