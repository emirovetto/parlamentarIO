import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { BloqueLogo } from "@/components/BloqueLogo";
import { imagenUrl } from "@/lib/imagenes";
import { fecha, nroExpediente, TIPO_NORMATIVA, ESTADO_EXPEDIENTE, ESTADO_COLOR, ROL_COMISION, CARGO_AUTORIDAD } from "@/lib/format";

export const metadata = { title: "Perfil de concejal" };
export const revalidate = 300;

export default async function ConcejalPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const concejal = await prisma.concejal.findUnique({
    where: { id },
    include: {
      bloque: true,
      comisiones: { include: { comision: true } },
      autoridades: { where: { hasta: null } },
      autorias: {
        include: { expediente: true },
        orderBy: { expediente: { fechaIngreso: "desc" } },
        take: 20,
      },
    },
  });
  if (!concejal) notFound();

  const [sesionesFinalizadas, presentismos, totalVotos] = await Promise.all([
    prisma.sesion.count({ where: { estado: "FINALIZADA" } }),
    prisma.asistencia.count({ where: { concejalId: id, presente: true, sesion: { estado: "FINALIZADA" } } }),
    prisma.voto.count({ where: { concejalId: id } }),
  ]);
  const asistenciaPct = sesionesFinalizadas > 0 ? Math.round((presentismos / sesionesFinalizadas) * 100) : null;
  const fotoSrc = imagenUrl(concejal.fotoId) ?? concejal.fotoUrl;
  const logoSrc = imagenUrl(concejal.bloque.logoId);

  return (
    <div className="space-y-8">
      <Link href="/concejales" className="text-sm text-blue-700 underline">
        ← Concejales
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2" style={{ backgroundColor: concejal.bloque.color }} />
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          <Avatar src={fotoSrc} nombre={concejal.nombre} apellido={concejal.apellido} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {concejal.nombre} {concejal.apellido}
              </h1>
              {concejal.autoridades.map((a) => (
                <Badge key={a.id} className="bg-amber-100 text-amber-800">
                  {CARGO_AUTORIDAD[a.cargo]}
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <BloqueLogo nombre={concejal.bloque.nombre} color={concejal.bloque.color} logoSrc={logoSrc} size={28} />
              <span className="font-medium text-slate-700">{concejal.bloque.nombre}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">{concejal.partido}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Mandato {fecha(concejal.mandatoInicio)} — {fecha(concejal.mandatoFin)}
            </p>
            {(concejal.email || concejal.telefono || concejal.celular) && (
              <ul className="mt-4 space-y-1 text-sm text-slate-600">
                {concejal.email ? (
                  <li>
                    <a href={`mailto:${concejal.email}`} className="text-blue-700 hover:underline">
                      {concejal.email}
                    </a>
                  </li>
                ) : null}
                {concejal.telefono ? <li>Tel. {concejal.telefono}</li> : null}
                {concejal.celular ? <li>Cel. {concejal.celular}</li> : null}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
          <p className="text-3xl font-bold text-slate-900">{asistenciaPct !== null ? `${asistenciaPct}%` : "—"}</p>
          <p className="mt-1 text-sm text-slate-500">Asistencia a sesiones</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
          <p className="text-3xl font-bold text-slate-900">{concejal.autorias.length}</p>
          <p className="mt-1 text-sm text-slate-500">Proyectos presentados</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
          <p className="text-3xl font-bold text-slate-900">{totalVotos}</p>
          <p className="mt-1 text-sm text-slate-500">Votos emitidos</p>
        </div>
      </div>

      {concejal.biografia ? (
        <section aria-labelledby="bio">
          <h2 id="bio" className="text-lg font-semibold text-slate-900">
            Biografía
          </h2>
          <p className="mt-2 whitespace-pre-line text-slate-600">{concejal.biografia}</p>
        </section>
      ) : null}

      <section aria-labelledby="comisiones">
        <h2 id="comisiones" className="text-lg font-semibold text-slate-900">
          Comisiones que integra
        </h2>
        {concejal.comisiones.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No integra comisiones actualmente.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {concejal.comisiones.map((m) => (
              <li key={m.id} className="rounded-full bg-slate-100 px-4 py-1.5 text-sm text-slate-700">
                {m.comision.nombre} <span className="text-xs text-slate-500">({ROL_COMISION[m.rol]})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="proyectos">
        <h2 id="proyectos" className="text-lg font-semibold text-slate-900">
          Proyectos presentados
        </h2>
        {concejal.autorias.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Sin proyectos registrados.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {concejal.autorias.map((a) => (
              <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/expedientes/${a.expediente.id}`} className="font-medium text-slate-900 hover:underline">
                    Expte. {nroExpediente(a.expediente)} — {TIPO_NORMATIVA[a.expediente.tipo]}
                  </Link>
                  <Badge className={ESTADO_COLOR[a.expediente.estado]}>{ESTADO_EXPEDIENTE[a.expediente.estado]}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">{a.expediente.caratula}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
