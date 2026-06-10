import { prisma } from "@/lib/prisma";
import { ConcejalCard } from "@/components/ConcejalCard";
import { BloqueLogo } from "@/components/BloqueLogo";
import { imagenUrl } from "@/lib/imagenes";

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
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Concejales</h1>
        <p className="mt-2 text-slate-600">
          Composición del cuerpo legislativo. Perfiles, contacto y trayectoria de cada representante.
        </p>
      </div>

      {bloques.map((b) => (
        <section key={b.id} aria-labelledby={`bloque-${b.id}`}>
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
            <BloqueLogo nombre={b.nombre} color={b.color} logoSrc={imagenUrl(b.logoId)} size={40} />
            <div>
              <h2 id={`bloque-${b.id}`} className="text-xl font-semibold text-slate-900">
                {b.nombre}
              </h2>
              <p className="text-sm text-slate-500">{b.partido}</p>
            </div>
            {b.email ? (
              <a href={`mailto:${b.email}`} className="ml-auto text-sm text-blue-700 hover:underline">
                {b.email}
              </a>
            ) : null}
          </div>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {b.concejales.map((c) => (
              <li key={c.id}>
                <ConcejalCard concejal={{ ...c, bloque: b }} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
