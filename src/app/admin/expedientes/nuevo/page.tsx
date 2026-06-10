import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_EXPEDIENTES } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Field, inputClass, btnPrimary } from "@/components/ui";
import { TIPO_NORMATIVA, ORIGEN_EXPEDIENTE } from "@/lib/format";
import { crearExpediente } from "../actions";
import { TipoNormativa, OrigenExpediente } from "@/generated/prisma/client";

export const metadata = { title: "Nuevo expediente" };

export default async function NuevoExpedientePage() {
  await requireRole(GESTION_EXPEDIENTES);
  const [bloques, concejales] = await Promise.all([
    prisma.bloque.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.concejal.findMany({ where: { activo: true }, orderBy: { apellido: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Ingreso de expediente</h1>
      <Card>
        <CardHeader
          title="Mesa de Entradas digital"
          subtitle="El número de expediente se asigna automáticamente por tipo y año"
        />
        <CardBody>
          <form action={crearExpediente} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de normativa" required>
                <select name="tipo" required className={inputClass}>
                  {Object.values(TipoNormativa).map((t) => (
                    <option key={t} value={t}>
                      {TIPO_NORMATIVA[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Origen" required>
                <select name="origen" required className={inputClass}>
                  {Object.values(OrigenExpediente).map((o) => (
                    <option key={o} value={o}>
                      {ORIGEN_EXPEDIENTE[o]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Carátula" required>
              <input name="caratula" required minLength={5} maxLength={300} className={inputClass} placeholder="Ej.: Creación del Programa Municipal de..." />
            </Field>
            <Field label="Descripción breve">
              <textarea name="descripcion" rows={2} maxLength={2000} className={inputClass} />
            </Field>
            <Field label="Texto completo del proyecto" required>
              <textarea name="textoCompleto" rows={10} required minLength={10} className={inputClass} placeholder="ARTÍCULO 1°: ..." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bloque presentante (si corresponde)">
                <select name="bloqueId" className={inputClass}>
                  <option value="">—</option>
                  {bloques.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Presentado por (DEM / particular)">
                <input name="presentadoPor" maxLength={200} className={inputClass} placeholder="Ej.: Intendencia Municipal" />
              </Field>
            </div>
            <Field label="Autores (concejales)">
              <select name="autores" multiple size={5} className={inputClass} aria-describedby="autores-ayuda">
                {concejales.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.apellido}, {c.nombre}
                  </option>
                ))}
              </select>
              <p id="autores-ayuda" className="mt-1 text-xs text-slate-500">
                Mantené presionada Cmd/Ctrl para seleccionar varios.
              </p>
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="esSensible" className="h-4 w-4 rounded border-slate-300" />
              Contiene datos personales sensibles (requerirá versión pública anonimizada — Ley 25.326)
            </label>
            <button type="submit" className={btnPrimary}>
              Ingresar expediente
            </button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
