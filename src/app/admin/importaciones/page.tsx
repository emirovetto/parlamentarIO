import { requireRole } from "@/lib/session";
import { GESTION_IMPORTACIONES } from "@/lib/rbac";
import { ImportForm } from "./ImportForm";
import { importarBloques, importarConcejales, importarOrdenanzas } from "./actions";

export const metadata = { title: "Importaciones" };

const PLANTILLA_BLOQUES = `nombre,partido,color
Frente Renovador Local,Frente Renovador,#0ea5e9
Juntos por la Ciudad,Juntos por el Cambio,#f59e0b`;

const PLANTILLA_CONCEJALES = `nombre,apellido,dni,partido,bloque,mandato_inicio,mandato_fin,biografia,email
Laura,Fernández,28111222,Frente Renovador,Frente Renovador Local,2019-12-10,2023-12-09,Concejal 2019-2023,
Martín,Bianchi,27777888,JxC,Juntos por la Ciudad,2019-12-10,2023-12-09,,`;

const PLANTILLA_ORDENANZAS = `numero,anio,tipo,caratula,texto,estado,numero_norma,fecha_promulgacion
1,2019,ordenanza,Ordenanza de Tasas Municipales,"ARTÍCULO 1°: ...",publicado,Ordenanza N° 2100/2019,2020-03-15
2,2020,resolucion,Solicitud de informes al DEM,"ARTÍCULO 1°: ...",publicado,,`;

export default async function ImportacionesPage() {
  await requireRole(GESTION_IMPORTACIONES);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Importaciones</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Cargá datos históricos desde CSV: bloques y partidos de legislaturas anteriores, concejales de
          mandatos pasados y ordenanzas ya sancionadas para el Digesto Legislativo.
        </p>
        <p className="mt-2 text-xs text-amber-700">
          Orden recomendado: 1) Bloques → 2) Concejales → 3) Ordenanzas. Los registros existentes se actualizan (upsert).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <ImportForm
          titulo="1. Bloques y partidos"
          descripcion="Partidos políticos y bloques de legislaturas anteriores. El campo color es opcional (#hex)."
          plantilla={PLANTILLA_BLOQUES}
          action={importarBloques}
        />
        <ImportForm
          titulo="2. Concejales históricos"
          descripcion="Concejales de mandatos anteriores. El bloque debe existir (importá bloques primero). Fechas: YYYY-MM-DD."
          plantilla={PLANTILLA_CONCEJALES}
          action={importarConcejales}
        />
        <ImportForm
          titulo="3. Ordenanzas y normativa"
          descripcion="Normas ya sancionadas para el digesto. Tipo: ordenanza, resolucion, decreto, declaracion, minuta. Estado: publicado, promulgado, archivado."
          plantilla={PLANTILLA_ORDENANZAS}
          action={importarOrdenanzas}
        />
      </div>
    </div>
  );
}
