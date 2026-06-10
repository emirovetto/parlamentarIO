import { Field, inputClass, btnPrimary } from "@/components/ui";
import { crearTarea } from "./actions";
import { TIPO_TAREA, PRIORIDAD_TAREA } from "@/lib/format";
import type { PrioridadTarea, TipoTarea } from "@/generated/prisma/client";

export function TareaForm({
  usuarios,
  concejales,
}: {
  usuarios: { id: string; nombre: string }[];
  concejales: { id: string; nombre: string; apellido: string }[];
}) {
  return (
    <form action={crearTarea} className="grid gap-4 sm:grid-cols-2">
      <Field label="Título" required>
        <input name="titulo" required minLength={3} className={inputClass} />
      </Field>
      <Field label="Fecha límite">
        <input name="fechaLimite" type="datetime-local" className={inputClass} />
      </Field>
      <Field label="Tipo">
        <select name="tipo" className={inputClass}>
          {(Object.keys(TIPO_TAREA) as TipoTarea[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_TAREA[t]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Prioridad">
        <select name="prioridad" className={inputClass}>
          {(Object.keys(PRIORIDAD_TAREA) as PrioridadTarea[]).map((p) => (
            <option key={p} value={p}>
              {PRIORIDAD_TAREA[p]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Asignar a usuario">
        <select name="userId" className={inputClass}>
          <option value="">— Seleccionar —</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
      </Field>
      <Field label="O asignar a concejal">
        <select name="concejalId" className={inputClass}>
          <option value="">— Seleccionar —</option>
          {concejales.map((c) => (
            <option key={c.id} value={c.id}>
              {c.apellido}, {c.nombre}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Enlace interno (opcional)">
          <input name="link" placeholder="/admin/expedientes/..." className={inputClass} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Descripción">
          <textarea name="descripcion" rows={2} className={inputClass} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <button type="submit" className={btnPrimary}>
          Crear tarea
        </button>
      </div>
    </form>
  );
}
