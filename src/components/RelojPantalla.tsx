"use client";

import { useEffect, useState } from "react";

export function RelojPantalla() {
  const [hora, setHora] = useState("");

  useEffect(() => {
    const tick = () => {
      setHora(
        new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="font-mono text-2xl font-semibold tabular-nums text-white/90">{hora}</span>;
}
