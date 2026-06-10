import { Field, inputClass, btnPrimary } from "@/components/ui";
import type { Bloque, Concejal } from "@/generated/prisma/client";

export function ConcejalForm({
  action,
  bloques,
  concejal,
  conEmail,
}: {
  action: (formData: FormData) => Promise<void>;
  bloques: Bloque[];
  concejal?: Concejal;
  conEmail?: boolean;
}) {
  const toInputDate = (d?: Date) => (d ? new Date(d).toISOString().slice(0, 10) : "");

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre" required>
        <input name="nombre" required defaultValue={concejal?.nombre} className={inputClass} />
      </Field>
      <Field label="Apellido" required>
        <input name="apellido" required defaultValue={concejal?.apellido} className={inputClass} />
      </Field>
      <Field label="DNI" required>
        <input name="dni" required pattern="\d{7,8}" defaultValue={concejal?.dni ?? ""} className={inputClass} />
      </Field>
      <Field label="Partido político" required>
        <input name="partido" required defaultValue={concejal?.partido} className={inputClass} />
      </Field>
      <Field label="Bloque" required>
        <select name="bloqueId" required defaultValue={concejal?.bloqueId} className={inputClass}>
          {bloques.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </select>
      </Field>
      {conEmail ? (
        <Field label="Email institucional (crea usuario para votar; contraseña inicial: su DNI)">
          <input name="email" type="email" className={inputClass} placeholder="apellido@concejo.gob.ar" />
        </Field>
      ) : (
        <div aria-hidden />
      )}
      <Field label="Inicio de mandato" required>
        <input name="mandatoInicio" type="date" required defaultValue={toInputDate(concejal?.mandatoInicio)} className={inputClass} />
      </Field>
      <Field label="Fin de mandato" required>
        <input name="mandatoFin" type="date" required defaultValue={toInputDate(concejal?.mandatoFin)} className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="URL de foto">
          <input name="fotoUrl" type="url" defaultValue={concejal?.fotoUrl ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Biografía">
          <textarea name="biografia" rows={4} defaultValue={concejal?.biografia ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <button type="submit" className={btnPrimary}>
          Guardar
        </button>
      </div>
    </form>
  );
}
