import { prisma } from "@/lib/prisma";

export type EventoAgenda = {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: Date;
  lugar?: string;
  tipo: "SESION" | "COMISION" | "AUDIENCIA" | "EVENTO";
  link?: string;
};

export async function getAgendaPublica(dias = 30): Promise<EventoAgenda[]> {
  const desde = new Date();
  const hasta = new Date();
  hasta.setDate(hasta.getDate() + dias);

  const [sesiones, audiencias, reuniones] = await Promise.all([
    prisma.sesion.findMany({
      where: { publicada: true, fecha: { gte: desde, lte: hasta }, estado: { not: "CANCELADA" } },
      orderBy: { fecha: "asc" },
    }),
    prisma.audienciaPublica.findMany({
      where: { estado: { in: ["CONVOCADA", "INSCRIPCION_ABIERTA"] }, fecha: { gte: desde, lte: hasta } },
      orderBy: { fecha: "asc" },
    }),
    prisma.reunionComision.findMany({
      where: { fecha: { gte: desde, lte: hasta } },
      include: { comision: true },
      orderBy: { fecha: "asc" },
    }),
  ]);

  const eventos: EventoAgenda[] = [
    ...sesiones.map((s) => ({
      id: s.id,
      titulo: `Sesión ${s.tipo} N° ${s.numero}/${s.anio}`,
      fecha: s.fecha,
      lugar: "Recinto del Concejo",
      tipo: "SESION" as const,
      link: `/sesiones/${s.id}`,
    })),
    ...audiencias.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      descripcion: a.descripcion.slice(0, 120),
      fecha: a.fecha,
      lugar: a.lugar,
      tipo: "AUDIENCIA" as const,
      link: "/participacion",
    })),
    ...reuniones.map((r) => ({
      id: r.id,
      titulo: `Reunión: ${r.comision.nombre}`,
      descripcion: r.ordenDelDia.slice(0, 120),
      fecha: r.fecha,
      tipo: "COMISION" as const,
      link: "/comisiones",
    })),
  ];

  return eventos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}
