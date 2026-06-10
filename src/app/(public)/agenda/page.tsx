import Link from "next/link";
import { getAgendaPublica } from "@/lib/agenda";
import { fechaHora } from "@/lib/format";

export const metadata = { title: "Agenda institucional" };
export const revalidate = 300;

const TIPO_LABEL = { SESION: "Sesión", COMISION: "Comisión", AUDIENCIA: "Audiencia", EVENTO: "Evento" } as const;
const TIPO_COLOR = {
  SESION: "bg-blue-100 text-blue-800",
  COMISION: "bg-violet-100 text-violet-800",
  AUDIENCIA: "bg-amber-100 text-amber-800",
  EVENTO: "bg-slate-100 text-slate-700",
};

export default async function AgendaPage() {
  const eventos = await getAgendaPublica(45);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Agenda institucional</h1>
        <p className="mt-2 text-slate-600">Sesiones, reuniones de comisión y audiencias públicas programadas.</p>
      </div>

      {eventos.length === 0 ? (
        <p className="text-slate-500">No hay eventos programados en las próximas semanas.</p>
      ) : (
        <ul className="space-y-4">
          {eventos.map((e) => (
            <li key={e.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TIPO_COLOR[e.tipo]}`}>
                    {TIPO_LABEL[e.tipo]}
                  </span>
                  {e.link ? (
                    <Link href={e.link} className="mt-2 block text-lg font-semibold text-slate-900 hover:underline">{e.titulo}</Link>
                  ) : (
                    <p className="mt-2 text-lg font-semibold text-slate-900">{e.titulo}</p>
                  )}
                  {e.descripcion ? <p className="mt-1 text-sm text-slate-600">{e.descripcion}</p> : null}
                  {e.lugar ? <p className="mt-1 text-sm text-slate-500">{e.lugar}</p> : null}
                </div>
                <time className="shrink-0 text-sm font-medium text-slate-700">{fechaHora(e.fecha)}</time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
