import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await prisma.paginaInstitucional.findFirst({ where: { slug, publicada: true } });
  return { title: p?.titulo ?? "Institucional" };
}

export default async function PaginaInstitucionalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pagina = await prisma.paginaInstitucional.findFirst({ where: { slug, publicada: true } });
  if (!pagina) notFound();

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link href="/" className="text-sm text-blue-700 underline">← Inicio</Link>
      <h1 className="text-3xl font-bold text-slate-900">{pagina.titulo}</h1>
      <div className="prose prose-slate max-w-none whitespace-pre-line text-slate-700">{pagina.contenido}</div>
    </article>
  );
}
