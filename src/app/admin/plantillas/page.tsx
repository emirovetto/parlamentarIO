import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_PORTAL } from "@/lib/rbac";
import { Card, CardHeader, CardBody, Table, Badge, Field, inputClass, btnPrimary } from "@/components/ui";
import { TIPO_PLANTILLA } from "@/lib/format";
import { crearPlantilla, actualizarPlantilla, alternarPlantilla } from "./actions";
import { TipoPlantilla } from "@/generated/prisma/client";

export const metadata = { title: "Plantillas y membretes" };

const VARIABLES_AYUDA = `Variables disponibles para actas de sesión:
{{municipio}} {{concejo}} {{provincia}} {{ciudad}} {{tipoSesion}} {{numero}} {{anio}}
{{dia}} {{mes}} {{anioCalendario}} {{hora}} {{horaCierre}} {{presidente}} {{secretarioParlamentario}}
{{listaAsistentes}} {{listaAusentes}} {{quorum}} {{ordenDelDia}} {{votaciones}} {{desarrollo}}`;

export default async function PlantillasPage() {
  await requireRole(GESTION_PORTAL);
  const plantillas = await prisma.plantillaDocumento.findMany({ orderBy: [{ tipo: "asc" }, { nombre: "asc" }] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Plantillas y membretes</h1>
        <p className="mt-1 text-sm text-slate-500">Modelos para actas, dictámenes y documentos institucionales con variables automáticas.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Plantillas registradas" />
          <Table headers={["Nombre", "Tipo", "Estado", ""]}>
            {plantillas.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {p.nombre}
                  {p.esDefault ? <Badge className="ml-2 bg-blue-100 text-blue-800">Default</Badge> : null}
                </td>
                <td className="px-4 py-3 text-slate-600">{TIPO_PLANTILLA[p.tipo]}</td>
                <td className="px-4 py-3">
                  <Badge className={p.activa ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}>
                    {p.activa ? "Activa" : "Inactiva"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <form action={alternarPlantilla.bind(null, p.id)}>
                    <button type="submit" className="text-sm text-blue-700 underline">{p.activa ? "Desactivar" : "Activar"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardHeader title="Nueva plantilla" />
          <CardBody>
            <form action={crearPlantilla} className="space-y-3">
              <Field label="Nombre" required>
                <input name="nombre" required className={inputClass} />
              </Field>
              <Field label="Tipo" required>
                <select name="tipo" required className={inputClass}>
                  {Object.values(TipoPlantilla).map((t) => (
                    <option key={t} value={t}>{TIPO_PLANTILLA[t]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Contenido" required>
                <textarea name="contenido" required rows={8} className={`${inputClass} font-mono text-xs`} placeholder={VARIABLES_AYUDA} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="esDefault" className="rounded" />
                Usar como plantilla predeterminada de este tipo
              </label>
              <button type="submit" className={btnPrimary}>Crear plantilla</button>
            </form>
          </CardBody>
        </Card>
      </div>

      {plantillas.map((p) => (
        <Card key={p.id}>
          <CardHeader title={`Editar: ${p.nombre}`} />
          <CardBody>
            <form action={actualizarPlantilla.bind(null, p.id)} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" required>
                  <input name="nombre" required defaultValue={p.nombre} className={inputClass} />
                </Field>
                <Field label="Tipo" required>
                  <select name="tipo" required defaultValue={p.tipo} className={inputClass}>
                    {Object.values(TipoPlantilla).map((t) => (
                      <option key={t} value={t}>{TIPO_PLANTILLA[t]}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Contenido">
                <textarea name="contenido" required rows={10} defaultValue={p.contenido} className={`${inputClass} font-mono text-xs`} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="esDefault" defaultChecked={p.esDefault} className="rounded" />
                Plantilla predeterminada
              </label>
              <button type="submit" className={btnPrimary}>Guardar</button>
            </form>
          </CardBody>
        </Card>
      ))}

      <Card>
        <CardHeader title="Referencia de variables" />
        <CardBody>
          <pre className="whitespace-pre-wrap text-xs text-slate-600">{VARIABLES_AYUDA}</pre>
        </CardBody>
      </Card>
    </div>
  );
}
