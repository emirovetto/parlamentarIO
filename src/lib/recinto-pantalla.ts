import { prisma } from "@/lib/prisma";
import { getConfiguracionSitio } from "@/lib/configuracion";
import type { ValorVoto } from "@/generated/prisma/client";

export type EstadoRecintoPantalla = {
  config: Awaited<ReturnType<typeof getConfiguracionSitio>>;
  sesion: {
    id: string;
    numero: number;
    anio: number;
    tipo: string;
    estado: string;
    fecha: Date;
  };
  quorum: { presentes: number; total: number; minimo: number; hayQuorum: boolean };
  puntoActual: { orden: number; titulo: string } | null;
  palabra: { nombre: string; apellido: string; inicio: Date } | null;
  votacionAbierta: {
    id: string;
    titulo: string;
    tipo: string;
    mayoria: string;
    afirmativos: number;
    negativos: number;
    abstenciones: number;
    totalVotos: number;
    presentes: number;
  } | null;
  concejales: {
    id: string;
    nombre: string;
    apellido: string;
    bloqueColor: string;
    bloqueNombre: string;
    presente: boolean;
    voto: ValorVoto | null;
  }[];
  ultimosResultados: { titulo: string; aprobada: boolean | null; resultado: string | null }[];
  ordenDelDia: { orden: number; titulo: string; tratado: boolean }[];
};

export async function getEstadoRecintoPantalla(sesionId: string): Promise<EstadoRecintoPantalla | null> {
  const [config, sesion, concejales] = await Promise.all([
    getConfiguracionSitio(),
    prisma.sesion.findUnique({
      where: { id: sesionId },
      include: {
        asistencias: true,
        puntos: { orderBy: { orden: "asc" } },
        votaciones: {
          orderBy: { createdAt: "desc" },
          include: { votos: true },
          take: 12,
        },
        usosPalabra: {
          where: { duracionSegundos: null },
          include: { concejal: true },
          take: 1,
        },
      },
    }),
    prisma.concejal.findMany({
      where: { activo: true },
      orderBy: { apellido: "asc" },
      include: { bloque: true },
    }),
  ]);

  if (!sesion || sesion.estado !== "EN_CURSO") return null;

  const presentesIds = new Set(sesion.asistencias.filter((a) => a.presente).map((a) => a.concejalId));
  const total = concejales.length;
  const presentes = presentesIds.size;
  const minimo = Math.floor(total / 2) + 1;

  const votacionAbierta = sesion.votaciones.find((v) => v.abierta);
  const votosMap = new Map(votacionAbierta?.votos.map((v) => [v.concejalId, v.valor]) ?? []);

  const palabra = sesion.usosPalabra[0];
  const puntoPendiente = sesion.puntos.find((p) => !p.tratado) ?? sesion.puntos[sesion.puntos.length - 1];

  return {
    config,
    sesion: {
      id: sesion.id,
      numero: sesion.numero,
      anio: sesion.anio,
      tipo: sesion.tipo,
      estado: sesion.estado,
      fecha: sesion.fecha,
    },
    quorum: { presentes, total, minimo, hayQuorum: presentes >= minimo },
    puntoActual: puntoPendiente ? { orden: puntoPendiente.orden, titulo: puntoPendiente.titulo } : null,
    palabra: palabra
      ? { nombre: palabra.concejal.nombre, apellido: palabra.concejal.apellido, inicio: palabra.inicio }
      : null,
    votacionAbierta: votacionAbierta
      ? {
          id: votacionAbierta.id,
          titulo: votacionAbierta.titulo,
          tipo: votacionAbierta.tipo,
          mayoria: votacionAbierta.mayoria,
          afirmativos: votacionAbierta.votos.filter((v) => v.valor === "AFIRMATIVO").length,
          negativos: votacionAbierta.votos.filter((v) => v.valor === "NEGATIVO").length,
          abstenciones: votacionAbierta.votos.filter((v) => v.valor === "ABSTENCION").length,
          totalVotos: votacionAbierta.votos.length,
          presentes,
        }
      : null,
    concejales: concejales.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      apellido: c.apellido,
      bloqueColor: c.bloque.color,
      bloqueNombre: c.bloque.nombre,
      presente: presentesIds.has(c.id),
      voto: votosMap.get(c.id) ?? null,
    })),
    ultimosResultados: sesion.votaciones
      .filter((v) => !v.abierta)
      .slice(0, 4)
      .map((v) => ({ titulo: v.titulo, aprobada: v.aprobada, resultado: v.resultado })),
    ordenDelDia: sesion.puntos.map((p) => ({ orden: p.orden, titulo: p.titulo, tratado: p.tratado })),
  };
}

export function revalidatePantallaRecinto(sesionId: string) {
  return `/recinto/${sesionId}`;
}
