"use client";

import { useActionState } from "react";
import { Field, inputClass, btnPrimary } from "@/components/ui";
import type { ImportResult } from "./actions";

export function ImportForm({
  titulo,
  descripcion,
  plantilla,
  action,
}: {
  titulo: string;
  descripcion: string;
  plantilla: string;
  action: (prev: ImportResult | null, formData: FormData) => Promise<ImportResult>;
}) {
  const [result, formAction, pending] = useActionState(action, null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{titulo}</h3>
      <p className="mt-1 text-sm text-slate-600">{descripcion}</p>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-blue-700">Ver formato CSV de ejemplo</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{plantilla}</pre>
      </details>
      <form action={formAction} className="mt-4 space-y-3">
        <Field label="Pegá el contenido CSV (con encabezado en la primera fila)" required>
          <textarea name="csv" rows={8} required className={inputClass} placeholder={plantilla.split("\n")[0]} />
        </Field>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Importando…" : "Importar"}
        </button>
      </form>
      {result ? (
        <div
          role="status"
          className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            result.errors.length === 0 ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"
          }`}
        >
          <p>
            <strong>{result.ok}</strong> importados · <strong>{result.skip}</strong> omitidos
          </p>
          {result.errors.length > 0 ? (
            <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-xs">
              {result.errors.slice(0, 20).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {result.errors.length > 20 ? <li>…y {result.errors.length - 20} errores más</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
