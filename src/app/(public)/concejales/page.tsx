import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fecha } from "@/lib/format";

export const metadata = { title: "Concejales" };
export const revalidate = 300;

export default async function ConcejalesPublicPage() {
  const bloques = await prisma.bloque.findMany({
    where: { activo: true, concejales: { some: { activo: true } } },
    orderBy: { nombre: "asc" },
    include: {
      concejales: { where: { activo: true }, orderBy: { apellido: "asc" } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Concejales</h1>
        <p className="mt-1 text-slate-600">Composición del cuerpo legislativo por bloque político.</p>
      </div>

      {bloques.map((b) => (
        <section key={b.id} aria-labelledby={`bloque-${b.id}`}>
          <h2 id={`bloque-${b.id}`} className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: b.color }} aria-hidden />
            {b.nombre}
            <span className="text-sm font-normal text-slate-500">({b.partido})</span>
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {b.concejales.map((c) => (
              <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <Link href={`/concejales/${c.id}`} className="font-medium text-slate-900 hover:underline">
                  {c.nombre} {c.apellido}
                </Link>
                <p className="mt-1 text-sm text-slate-500">{c.partido}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Mandato: {fecha(c.mandatoInicio)} — {fecha(c.mandatoFin)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
