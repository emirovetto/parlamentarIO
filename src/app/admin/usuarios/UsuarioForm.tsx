import { Field, inputClass, btnPrimary } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/rbac";
import type { Bloque, Role, User } from "@/generated/prisma/client";

type ConcejalOption = { id: string; nombre: string; apellido: string; userId: string | null };

const ROLES_BACKOFFICE: Role[] = [
  "ADMIN",
  "PRESIDENTE",
  "SECRETARIO_PARLAMENTARIO",
  "SECRETARIO_ADMINISTRATIVO",
  "CONCEJAL",
  "SECRETARIO_BLOQUE",
  "EMPLEADO_COMISION",
];

export function UsuarioForm({
  action,
  bloques,
  concejales,
  usuario,
  esNuevo,
}: {
  action: (formData: FormData) => Promise<void>;
  bloques: Bloque[];
  concejales: ConcejalOption[];
  usuario?: User & { concejal?: { id: string } | null };
  esNuevo?: boolean;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre completo" required>
        <input name="nombre" required defaultValue={usuario?.nombre} className={inputClass} />
      </Field>
      <Field label="Email institucional" required>
        <input name="email" type="email" required defaultValue={usuario?.email} readOnly={!esNuevo} className={inputClass} />
      </Field>
      <Field label="Rol en el sistema" required>
        <select name="role" required defaultValue={usuario?.role} className={inputClass}>
          {ROLES_BACKOFFICE.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={esNuevo ? "Contraseña inicial" : "Nueva contraseña (dejar vacío para no cambiar)"} required={esNuevo}>
        <input name="password" type="password" minLength={6} required={esNuevo} className={inputClass} autoComplete="new-password" />
      </Field>
      <Field label="Bloque (secretario de bloque / concejal)">
        <select name="bloqueId" defaultValue={usuario?.bloqueId ?? ""} className={inputClass}>
          <option value="">— Sin bloque —</option>
          {bloques.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Vincular a concejal existente">
        <select name="concejalId" defaultValue={usuario?.concejal?.id ?? ""} className={inputClass}>
          <option value="">— Sin vincular —</option>
          {concejales
            .filter((c) => !c.userId || c.userId === usuario?.id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.apellido}, {c.nombre}
              </option>
            ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <button type="submit" className={btnPrimary}>
          Guardar usuario
        </button>
      </div>
    </form>
  );
}
