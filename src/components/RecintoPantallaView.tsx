import { TIPO_SESION, TIPO_VOTACION, MAYORIA, VALOR_VOTO } from "@/lib/format";
import type { EstadoRecintoPantalla } from "@/lib/recinto-pantalla";
import { RelojPantalla } from "@/components/RelojPantalla";
import { Cronometro } from "@/components/Cronometro";
import type { TipoSesion, TipoVotacion, MayoriaRequerida, ValorVoto } from "@/generated/prisma/client";

const VOTO_STYLE: Record<ValorVoto, string> = {
  AFIRMATIVO: "bg-emerald-500 text-white ring-emerald-300",
  NEGATIVO: "bg-rose-600 text-white ring-rose-300",
  ABSTENCION: "bg-amber-500 text-white ring-amber-300",
};

export function RecintoPantallaView({ estado }: { estado: EstadoRecintoPantalla }) {
  const { config, sesion, quorum, votacionAbierta, palabra, concejales, ultimosResultados, ordenDelDia, puntoActual } = estado;
  const tipoSesion = TIPO_SESION[sesion.tipo as TipoSesion];

  return (
    <div
      className="relative flex h-[1080px] w-[1920px] flex-col overflow-hidden text-white"
      style={{
        background: `linear-gradient(160deg, ${config.colorPrimario} 0%, #0a1628 45%, #050d18 100%)`,
      }}
    >
      {/* Encabezado */}
      <header className="flex items-center justify-between border-b border-white/10 px-10 py-5">
        <div className="flex items-center gap-5">
          {config.logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logoSrc} alt="" className="h-16 w-16 rounded-lg object-contain bg-white/10" />
          ) : null}
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/60">{config.nombreMunicipio}</p>
            <h1 className="text-3xl font-bold tracking-tight">{config.nombreConcejo}</h1>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm uppercase tracking-widest text-sky-300">Sesión en curso</p>
          <p className="text-4xl font-bold">
            {tipoSesion} N° {sesion.numero}/{sesion.anio}
          </p>
        </div>

        <div className="flex items-center gap-8">
          <div
            className={`rounded-2xl px-8 py-4 text-center ${quorum.hayQuorum ? "bg-emerald-500/20 ring-2 ring-emerald-400" : "bg-rose-500/20 ring-2 ring-rose-400"}`}
          >
            <p className="text-4xl font-bold tabular-nums">
              {quorum.presentes}/{quorum.total}
            </p>
            <p className="text-sm font-semibold uppercase tracking-wide">
              {quorum.hayQuorum ? "Quórum legal" : `Sin quórum (mín. ${quorum.minimo})`}
            </p>
          </div>
          <RelojPantalla />
        </div>
      </header>

      <div className="grid flex-1 grid-cols-12 gap-0">
        {/* Orden del día */}
        <aside className="col-span-3 border-r border-white/10 bg-black/20 p-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-white/50">Orden del día</h2>
          <ol className="space-y-2">
            {ordenDelDia.map((p) => (
              <li
                key={p.orden}
                className={`rounded-lg px-3 py-2 text-sm ${
                  !p.tratado && puntoActual?.orden === p.orden
                    ? "bg-sky-500/30 font-semibold text-white ring-1 ring-sky-400"
                    : p.tratado
                      ? "text-white/40 line-through"
                      : "text-white/70"
                }`}
              >
                <span className="mr-2 font-mono text-white/50">{p.orden}.</span>
                {p.titulo}
              </li>
            ))}
          </ol>
        </aside>

        {/* Centro: votación o estado */}
        <main className="col-span-6 flex flex-col p-8">
          {palabra ? (
            <div className="mb-6 rounded-2xl bg-violet-500/20 px-8 py-5 ring-1 ring-violet-400/50">
              <p className="text-sm font-semibold uppercase tracking-widest text-violet-200">Uso de la palabra</p>
              <p className="mt-1 text-4xl font-bold">
                {palabra.apellido}, {palabra.nombre}
              </p>
              <div className="mt-3">
                <Cronometro inicioIso={palabra.inicio.toISOString()} className="text-6xl text-white" />
              </div>
            </div>
          ) : null}

          {votacionAbierta ? (
            <div className="flex flex-1 flex-col">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Votación en curso</p>
              <h2 className="mt-2 text-4xl font-bold leading-tight">{votacionAbierta.titulo}</h2>
              <p className="mt-2 text-lg text-white/60">
                {TIPO_VOTACION[votacionAbierta.tipo as TipoVotacion]} · {MAYORIA[votacionAbierta.mayoria as MayoriaRequerida]}
              </p>

              <div className="mt-10 grid grid-cols-3 gap-6" aria-live="polite">
                {(
                  [
                    { key: "AFIRMATIVO", n: votacionAbierta.afirmativos, bg: "from-emerald-600 to-emerald-800" },
                    { key: "NEGATIVO", n: votacionAbierta.negativos, bg: "from-rose-600 to-rose-900" },
                    { key: "ABSTENCION", n: votacionAbierta.abstenciones, bg: "from-amber-500 to-amber-700" },
                  ] as const
                ).map((col) => (
                  <div
                    key={col.key}
                    className={`rounded-3xl bg-gradient-to-b ${col.bg} px-6 py-10 text-center shadow-2xl`}
                  >
                    <p className="text-8xl font-black tabular-nums">{col.n}</p>
                    <p className="mt-2 text-xl font-semibold uppercase tracking-wide">
                      {VALOR_VOTO[col.key]}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-center text-2xl text-white/70">
                Votaron <span className="font-bold text-white">{votacionAbierta.totalVotos}</span> de{" "}
                <span className="font-bold text-white">{votacionAbierta.presentes}</span> presentes
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              {puntoActual ? (
                <>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">Punto en tratamiento</p>
                  <p className="mt-2 font-mono text-2xl text-white/50">Punto {puntoActual.orden}</p>
                  <h2 className="mt-4 max-w-3xl text-5xl font-bold leading-tight">{puntoActual.titulo}</h2>
                </>
              ) : (
                <p className="text-3xl text-white/50">Sesión en desarrollo</p>
              )}
            </div>
          )}
        </main>

        {/* Grilla de concejales */}
        <aside className="col-span-3 border-l border-white/10 bg-black/25 p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-white/50">Cuerpo legislativo</h2>
          <ul className="grid grid-cols-2 gap-2 overflow-hidden">
            {concejales.map((c) => {
              const inicial = `${c.nombre.charAt(0)}${c.apellido.charAt(0)}`;
              const votoClass = c.voto ? VOTO_STYLE[c.voto] : c.presente ? "bg-white/10 text-white/50 ring-white/20" : "bg-white/5 text-white/25 ring-white/10";
              return (
                <li
                  key={c.id}
                  className={`flex items-center gap-2 rounded-xl px-2 py-2 ring-1 ${votoClass} ${!c.presente ? "opacity-40" : ""}`}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                    style={{ backgroundColor: c.bloqueColor }}
                  >
                    {inicial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">
                      {c.apellido}
                    </p>
                    <p className="truncate text-[10px] opacity-70">
                      {c.voto ? VALOR_VOTO[c.voto] : c.presente ? "Pendiente" : "Ausente"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      {/* Ticker resultados */}
      {ultimosResultados.length > 0 ? (
        <footer className="border-t border-white/10 bg-black/40 px-10 py-4">
          <div className="flex items-center gap-8 overflow-hidden">
            <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-white/40">Últimos resultados</span>
            {ultimosResultados.map((r, i) => (
              <span key={i} className="flex shrink-0 items-center gap-2 text-sm">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.aprobada ? "bg-emerald-500" : "bg-rose-600"}`}
                >
                  {r.aprobada ? "APROBADO" : "RECHAZADO"}
                </span>
                <span className="text-white/80">{r.titulo}</span>
              </span>
            ))}
          </div>
        </footer>
      ) : null}

      <div className="absolute bottom-2 right-4 text-[10px] text-white/20">parlamentarIO · 1920×1080</div>
    </div>
  );
}
