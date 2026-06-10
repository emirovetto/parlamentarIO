import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, inputClass } from "@/components/ui";
import { nroExpediente, fecha, TIPO_NORMATIVA, ESTADO_EXPEDIENTE, ESTADO_COLOR } from "@/lib/format";
import { TipoNormativa, EstadoExpediente, type Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Digesto Legislativo" };

type ResultadoFts = {
  id: string;
  numero: number;
  anio: number;
  tipo: TipoNormativa;
  caratula: string;
  estado: EstadoExpediente;
  numeroNorma: string | null;
  fechaIngreso: Date;
};

export default async function DigestoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; anio?: string }>;
}) {
  const { q, tipo, anio } = await searchParams;
  const anioNum = Number(anio) || undefined;
  const tipoValido = tipo && tipo in TipoNormativa ? (tipo as TipoNormativa) : undefined;

  let resultados: ResultadoFts[];

  // Seguimiento por número exacto: "123/2026" o "0123/2026"
  const matchNumero = q?.trim().match(/^(\d{1,4})\/(\d{4})$/);

  if (matchNumero) {
    resultados = await prisma.expediente.findMany({
      where: { numero: Number(matchNumero[1]), anio: Number(matchNumero[2]) },
      select: { id: true, numero: true, anio: true, tipo: true, caratula: true, estado: true, numeroNorma: true, fechaIngreso: true },
    });
  } else if (q && q.trim().length > 1) {
    // Búsqueda full-text en español (índice GIN sobre carátula + descripción + texto)
    resultados = await prisma.$queryRaw<ResultadoFts[]>`
      SELECT id, numero, anio, tipo, caratula, estado, "numeroNorma", "fechaIngreso"
      FROM "Expediente"
      WHERE to_tsvector('spanish', coalesce("caratula",'') || ' ' || coalesce("descripcion",'') || ' ' || coalesce("textoCompleto",''))
            @@ plainto_tsquery('spanish', ${q.trim()})
        AND (${tipoValido ?? null}::text IS NULL OR tipo::text = ${tipoValido ?? null}::text)
        AND (${anioNum ?? null}::int IS NULL OR anio = ${anioNum ?? null}::int)
      ORDER BY ts_rank(
        to_tsvector('spanish', coalesce("caratula",'') || ' ' || coalesce("descripcion",'') || ' ' || coalesce("textoCompleto",'')),
        plainto_tsquery('spanish', ${q.trim()})
      ) DESC
      LIMIT 50
    `;
  } else {
    const where: Prisma.ExpedienteWhereInput = {};
    if (tipoValido) where.tipo = tipoValido;
    if (anioNum) where.anio = anioNum;
    resultados = await prisma.expediente.findMany({
      where,
      select: { id: true, numero: true, anio: true, tipo: true, caratula: true, estado: true, numeroNorma: true, fechaIngreso: true },
      orderBy: [{ anio: "desc" }, { numero: "desc" }],
      take: 50,
    });
  }

  const anios = await prisma.expediente.findMany({ select: { anio: true }, distinct: ["anio"], orderBy: { anio: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Digesto Legislativo</h1>
        <p className="mt-1 text-slate-600">
          Buscá ordenanzas, resoluciones, decretos, minutas y declaraciones por texto completo.
        </p>
      </div>

      <form method="get" role="search" aria-label="Buscar en el digesto" className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="sr-only" htmlFor="busqueda">Texto a buscar</label>
        <input
          id="busqueda"
          name="q"
          defaultValue={q}
          placeholder='Buscar por texto ("huertas urbanas") o por número de expediente ("3/2026")'
          className={`${inputClass} min-w-60 flex-1`}
        />
        <select name="tipo" defaultValue={tipo ?? ""} aria-label="Tipo de normativa" className={`${inputClass} w-auto`}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_NORMATIVA).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="anio" defaultValue={anio ?? ""} aria-label="Año" className={`${inputClass} w-auto`}>
          <option value="">Todos los años</option>
          {anios.map((a) => (
            <option key={a.anio} value={a.anio}>{a.anio}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-[#1e3a5f] px-5 py-2 text-sm font-medium text-white hover:bg-[#2d5482]">
          Buscar
        </button>
      </form>

      <p className="text-sm text-slate-500" aria-live="polite">
        {resultados.length} resultado{resultados.length === 1 ? "" : "s"}
        {q ? <> para <strong>&ldquo;{q}&rdquo;</strong></> : null}
      </p>

      <ul className="space-y-3">
        {resultados.map((e) => (
          <li key={e.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/expedientes/${e.id}`} className="font-medium text-slate-900 hover:underline">
                {e.numeroNorma ?? `${TIPO_NORMATIVA[e.tipo]} — Expte. ${nroExpediente(e)}`}
              </Link>
              <Badge className={ESTADO_COLOR[e.estado]}>{ESTADO_EXPEDIENTE[e.estado]}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">{e.caratula}</p>
            <p className="mt-1 text-xs text-slate-400">Ingreso: {fecha(e.fechaIngreso)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
