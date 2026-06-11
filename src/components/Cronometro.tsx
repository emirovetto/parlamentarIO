"use client";

import { useEffect, useState } from "react";

/** Cronómetro de uso de la palabra: cuenta desde el instante de inicio. */
export function Cronometro({ inicioIso, className = "text-3xl" }: { inicioIso: string; className?: string }) {
  const [segundos, setSegundos] = useState(() =>
    Math.max(0, Math.round((Date.now() - new Date(inicioIso).getTime()) / 1000)),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSegundos(Math.max(0, Math.round((Date.now() - new Date(inicioIso).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [inicioIso]);

  const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
  const ss = String(segundos % 60).padStart(2, "0");

  return (
    <span className={`font-mono font-bold tabular-nums ${className}`} aria-live="off">
      {mm}:{ss}
    </span>
  );
}
