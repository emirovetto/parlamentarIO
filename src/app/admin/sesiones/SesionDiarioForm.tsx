"use client";

import { ActaEditor } from "@/components/ActaEditor";
import { Field, inputClass, btnPrimary } from "@/components/ui";
import { generarBorradorActaAction } from "./acta-actions";

export function SesionDiarioForm({
  sesionId,
  actaDefault,
  videoUrlDefault,
  notasDefault,
  action,
}: {
  sesionId: string;
  actaDefault: string;
  videoUrlDefault: string;
  notasDefault: string;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="space-y-3">
      <ActaEditor defaultValue={actaDefault} onGenerar={() => generarBorradorActaAction(sesionId)} />
      <Field label="URL del video archivado (grabación post-transmisión)">
        <input name="videoUrl" type="url" defaultValue={videoUrlDefault} className={inputClass} placeholder="https://www.youtube.com/watch?v=..." />
      </Field>
      <Field label="Notas y observaciones post-sesión">
        <textarea name="notasPostSesion" rows={3} defaultValue={notasDefault} className={inputClass} />
      </Field>
      <button type="submit" className={btnPrimary}>Guardar diario</button>
    </form>
  );
}
