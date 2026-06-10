import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { fechaHora, TIPO_SESION, ESTADO_SESION } from "@/lib/format";

export const metadata = { title: "Sesiones" };
export const revalidate = 300;

export default async function SesionesPublicPage() {
  const sesiones = await prisma.sesion.findMany({
    where: { publicada: true },
    orderBy: [{ anio: "desc" }, { numero: "desc" }],
    include: { _count: { select: { puntos: true } } },
    take: 40,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sesiones del Concejo</h1>
        <p className="mt-1 text-slate-600">Órdenes del día, actas y videos de las sesiones.</p>
      </div>

      <ul className="space-y-3">
        {sesiones.length === 0 ? (
          <li className="text-sm text-slate-500">Aún no hay sesiones publicadas.</li>
        ) : (
          sesiones.map((s) => (
            <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/sesiones/${s.id}`} className="font-medium text-slate-900 hover:underline">
                  Sesión {TIPO_SESION[s.tipo]} N° {s.numero}/{s.anio}
                </Link>
                <Badge
                  className={
                    s.estado === "EN_CURSO"
                      ? "bg-green-100 text-green-800"
                      : s.estado === "PROGRAMADA"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-200 text-slate-700"
                  }
                >
                  {ESTADO_SESION[s.estado]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {fechaHora(s.fecha)} · {s._count.puntos} puntos en el Orden del Día
                {s.videoUrl ? " · Video disponible" : ""}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
