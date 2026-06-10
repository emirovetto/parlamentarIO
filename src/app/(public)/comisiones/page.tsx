import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ROL_COMISION } from "@/lib/format";

export const metadata = { title: "Comisiones" };
export const revalidate = 300;

export default async function ComisionesPublicPage() {
  const comisiones = await prisma.comision.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
    include: {
      miembros: { include: { concejal: { include: { bloque: true } } } },
      _count: { select: { dictamenes: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Comisiones</h1>
        <p className="mt-2 text-slate-600">Órganos técnicos del Concejo que analizan los proyectos legislativos.</p>
      </div>

      <ul className="grid gap-6 md:grid-cols-2">
        {comisiones.map((c) => (
          <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">{c.nombre}</h2>
            {c.descripcion ? <p className="mt-2 text-sm text-slate-600">{c.descripcion}</p> : null}
            <p className="mt-3 text-xs text-slate-400">{c._count.dictamenes} dictámenes emitidos</p>
            {c.miembros.length > 0 ? (
              <ul className="mt-4 space-y-1 border-t border-slate-100 pt-4">
                {c.miembros.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <Link href={`/concejales/${m.concejal.id}`} className="text-slate-800 hover:underline">
                      {m.concejal.apellido}, {m.concejal.nombre}
                    </Link>
                    <span className="text-xs text-slate-500">{ROL_COMISION[m.rol]}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
