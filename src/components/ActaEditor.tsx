"use client";

import { useState } from "react";
import { Field, inputClass, btnPrimary, btnSecondary } from "@/components/ui";

export function ActaEditor({
  name = "acta",
  defaultValue = "",
  onGenerar,
}: {
  name?: string;
  defaultValue?: string;
  onGenerar?: () => Promise<string>;
}) {
  const [valor, setValor] = useState(defaultValue);
  const [generando, setGenerando] = useState(false);

  async function generar() {
    if (!onGenerar) return;
    setGenerando(true);
    try {
      const texto = await onGenerar();
      setValor(texto);
    } finally {
      setGenerando(false);
    }
  }

  function insertar(before: string, after = "") {
    const ta = document.getElementById("acta-editor") as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = valor.slice(start, end);
    const nuevo = valor.slice(0, start) + before + sel + after + valor.slice(end);
    setValor(nuevo);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => insertar("**", "**")} className={btnSecondary}>Negrita</button>
        <button type="button" onClick={() => insertar("\n## ", "")} className={btnSecondary}>Título</button>
        <button type="button" onClick={() => insertar("\n• ", "")} className={btnSecondary}>Viñeta</button>
        {onGenerar ? (
          <button type="button" onClick={generar} disabled={generando} className={btnPrimary}>
            {generando ? "Generando…" : "Generar borrador desde sesión"}
          </button>
        ) : null}
      </div>
      <Field label="Acta de la sesión">
        <textarea
          id="acta-editor"
          name={name}
          rows={14}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className={`${inputClass} font-mono text-sm leading-relaxed`}
          placeholder="En la ciudad de..., a los ... días del mes de ..., se reúnen..."
        />
      </Field>
      <p className="text-xs text-slate-500">
        Usá &quot;Generar borrador&quot; para completar automáticamente con asistencia, orden del día y votaciones según la plantilla institucional.
      </p>
    </div>
  );
}
