import { prisma } from "@/lib/prisma";
import { Field, inputClass } from "@/components/ui";
import { fechaHora, ESTADO_AUDIENCIA } from "@/lib/format";
import { solicitarBanca, inscribirseAudiencia } from "./actions";

export const metadata = { title: "Participación ciudadana" };

const MENSAJES: Record<string, { tipo: "ok" | "error"; texto: string }> = {
  banca: { tipo: "ok", texto: "Tu solicitud de Banca del Ciudadano fue recibida. Te contactaremos por email." },
  audiencia: { tipo: "ok", texto: "Inscripción a la audiencia pública registrada correctamente." },
  "ya-inscripto": { tipo: "error", texto: "Ya existe una inscripción con ese DNI para esta audiencia." },
  "inscripcion-cerrada": { tipo: "error", texto: "La inscripción a esta audiencia está cerrada." },
};

export default async function ParticipacionPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const mensaje = MENSAJES[ok ?? error ?? ""];

  const audiencias = await prisma.audienciaPublica.findMany({
    where: { estado: { in: ["CONVOCADA", "INSCRIPCION_ABIERTA", "REALIZADA"] } },
    orderBy: { fecha: "desc" },
    include: { _count: { select: { inscripciones: true } }, documentos: { where: { publico: true }, select: { id: true, nombre: true } } },
    take: 10,
  });
  const audienciasAbiertas = audiencias.filter((a) => a.estado === "INSCRIPCION_ABIERTA");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Participación ciudadana</h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          El Concejo es de los vecinos. Pedí la Banca del Ciudadano para exponer en el recinto o
          inscribite en las audiencias públicas.
        </p>
      </div>

      {mensaje ? (
        <p
          role="alert"
          className={`rounded-lg px-4 py-3 text-sm ${
            mensaje.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {mensaje.texto}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="banca" className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 id="banca" className="text-lg font-semibold text-slate-900">Banca del Ciudadano</h2>
          <p className="mt-1 text-sm text-slate-600">
            Solicitá el uso de la palabra en una sesión del Concejo. La Presidencia evaluará tu solicitud
            y te asignará fecha. Los datos personales se tratan según la Ley 25.326.
          </p>
          <form action={solicitarBanca} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" required>
                <input name="nombre" required minLength={2} className={inputClass} autoComplete="given-name" />
              </Field>
              <Field label="Apellido" required>
                <input name="apellido" required minLength={2} className={inputClass} autoComplete="family-name" />
              </Field>
              <Field label="DNI" required>
                <input name="dni" required pattern="\d{7,8}" inputMode="numeric" className={inputClass} aria-describedby="dni-ayuda" />
              </Field>
              <Field label="Email" required>
                <input name="email" type="email" required className={inputClass} autoComplete="email" />
              </Field>
            </div>
            <Field label="Teléfono">
              <input name="telefono" type="tel" className={inputClass} autoComplete="tel" />
            </Field>
            <Field label="Tema a exponer" required>
              <input name="tema" required minLength={5} maxLength={200} className={inputClass} />
            </Field>
            <Field label="Fundamentación" required>
              <textarea name="fundamentacion" rows={4} required minLength={20} className={inputClass} placeholder="Contanos por qué querés exponer este tema ante el Concejo..." />
            </Field>
            <button type="submit" className="rounded-lg bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2d5482]">
              Enviar solicitud
            </button>
          </form>
        </section>

        <section aria-labelledby="audiencias" className="space-y-4">
          <h2 id="audiencias" className="text-lg font-semibold text-slate-900">Audiencias públicas</h2>
          {audiencias.length === 0 ? (
            <p className="text-sm text-slate-500">No hay audiencias públicas convocadas.</p>
          ) : (
            audiencias.map((a) => (
              <article key={a.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium text-slate-900">{a.titulo}</h3>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    {ESTADO_AUDIENCIA[a.estado]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{a.descripcion}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {fechaHora(a.fecha)} · {a.lugar} · {a._count.inscripciones} inscriptos
                </p>
                {a.documentos.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {a.documentos.map((d) => (
                      <li key={d.id}>
                        <a href={`/api/documentos/${d.id}`} className="text-sm text-blue-700 underline">
                          Material de consulta: {d.nombre}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {a.resolucion ? (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <strong>Resolución:</strong> {a.resolucion}
                  </p>
                ) : null}
              </article>
            ))
          )}

          {audienciasAbiertas.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900">Inscribirse a una audiencia</h3>
              <form action={inscribirseAudiencia} className="mt-4 space-y-4">
                <Field label="Audiencia" required>
                  <select name="audienciaId" required className={inputClass}>
                    {audienciasAbiertas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.titulo}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre" required>
                    <input name="nombre" required minLength={2} className={inputClass} />
                  </Field>
                  <Field label="Apellido" required>
                    <input name="apellido" required minLength={2} className={inputClass} />
                  </Field>
                  <Field label="DNI" required>
                    <input name="dni" required pattern="\d{7,8}" inputMode="numeric" className={inputClass} />
                  </Field>
                  <Field label="Email" required>
                    <input name="email" type="email" required className={inputClass} />
                  </Field>
                </div>
                <Field label="Postura u observaciones">
                  <textarea name="postura" rows={3} maxLength={2000} className={inputClass} />
                </Field>
                <button type="submit" className="rounded-lg bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2d5482]">
                  Inscribirme
                </button>
              </form>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
