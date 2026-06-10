import { prisma } from "@/lib/prisma";
import type { Role, TipoTarea, PrioridadTarea, EstadoTarea } from "@/generated/prisma/client";

export type TareaBandeja = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  tipo: TipoTarea;
  prioridad: PrioridadTarea;
  link?: string | null;
  fechaLimite?: Date | null;
  automatica: boolean;
  estado?: EstadoTarea;
};

function inicioHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function finHoy() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function finSemana() {
  const d = inicioHoy();
  d.setDate(d.getDate() + 7);
  return d;
}

function esParaHoy(fecha: Date | null | undefined) {
  if (!fecha) return true;
  const f = new Date(fecha);
  return f >= inicioHoy() && f <= finHoy();
}

async function tareasDerivadasConcejal(concejalId: string): Promise<TareaBandeja[]> {
  const tareas: TareaBandeja[] = [];
  const hoy = inicioHoy();
  const fin = finHoy();

  const comisionIds = (
    await prisma.comisionMiembro.findMany({
      where: { concejalId },
      select: { comisionId: true },
    })
  ).map((m) => m.comisionId);

  // Sesiones de hoy
  const sesionesHoy = await prisma.sesion.findMany({
    where: {
      estado: { in: ["PROGRAMADA", "EN_CURSO"] },
      fecha: { gte: hoy, lte: fin },
    },
    orderBy: { fecha: "asc" },
  });
  for (const s of sesionesHoy) {
    tareas.push({
      id: `sesion-${s.id}`,
      titulo: `Sesión ${s.tipo} N° ${s.numero}/${s.anio}`,
      descripcion: s.estado === "EN_CURSO" ? "Sesión en curso — ingresar al recinto" : "Sesión programada para hoy",
      tipo: "SESION",
      prioridad: s.estado === "EN_CURSO" ? "URGENTE" : "ALTA",
      link: `/admin/sesiones/${s.id}`,
      fechaLimite: s.fecha,
      automatica: true,
    });
  }

  // Votaciones abiertas sin voto del concejal
  const votacionesAbiertas = await prisma.votacion.findMany({
    where: {
      abierta: true,
      sesion: { estado: "EN_CURSO" },
      votos: { none: { concejalId } },
    },
    include: { sesion: true },
  });
  for (const v of votacionesAbiertas) {
    tareas.push({
      id: `voto-${v.id}`,
      titulo: `Votar: ${v.titulo}`,
      descripcion: `Sesión N° ${v.sesion.numero}/${v.sesion.anio}`,
      tipo: "VOTACION",
      prioridad: "URGENTE",
      link: `/admin/votar`,
      fechaLimite: fin,
      automatica: true,
    });
  }

  // Dictámenes pendientes de firma en comisiones del concejal
  if (comisionIds.length > 0) {
    const dictamenes = await prisma.dictamen.findMany({
      where: {
        comisionId: { in: comisionIds },
        firmas: { none: { concejalId } },
      },
      include: { expediente: true, comision: true },
      take: 10,
    });
    for (const d of dictamenes) {
      tareas.push({
        id: `dictamen-${d.id}`,
        titulo: `Firmar dictamen — Expte. ${d.expediente.numero}/${d.expediente.anio}`,
        descripcion: `Comisión ${d.comision.nombre}`,
        tipo: "DICTAMEN",
        prioridad: "ALTA",
        link: `/admin/expedientes/${d.expedienteId}`,
        automatica: true,
      });
    }

    // Reuniones de comisión próximas (hoy y semana)
    const reuniones = await prisma.reunionComision.findMany({
      where: {
        comisionId: { in: comisionIds },
        fecha: { gte: hoy, lte: finSemana() },
      },
      include: { comision: true },
      orderBy: { fecha: "asc" },
    });
    for (const r of reuniones) {
      tareas.push({
        id: `reunion-${r.id}`,
        titulo: `Reunión: ${r.comision.nombre}`,
        descripcion: r.ordenDelDia.slice(0, 120),
        tipo: "COMISION",
        prioridad: esParaHoy(r.fecha) ? "ALTA" : "NORMAL",
        link: `/admin/comisiones`,
        fechaLimite: r.fecha,
        automatica: true,
      });
    }

    // Expedientes en comisión
    const enComision = await prisma.expediente.findMany({
      where: {
        estado: "EN_COMISION",
        giros: { some: { comisionId: { in: comisionIds } } },
      },
      take: 8,
      orderBy: { fechaIngreso: "desc" },
    });
    for (const e of enComision) {
      tareas.push({
        id: `exp-comision-${e.id}`,
        titulo: `Revisar en comisión — Expte. ${e.numero}/${e.anio}`,
        descripcion: e.caratula,
        tipo: "EXPEDIENTE",
        prioridad: "NORMAL",
        link: `/admin/expedientes/${e.id}`,
        automatica: true,
      });
    }
  }

  return tareas;
}

async function tareasDerivadasSecretario(role: Role): Promise<TareaBandeja[]> {
  const tareas: TareaBandeja[] = [];
  const hoy = inicioHoy();
  const fin = finHoy();

  if (role === "SECRETARIO_PARLAMENTARIO" || role === "ADMIN" || role === "PRESIDENTE") {
    const bancas = await prisma.solicitudBanca.count({ where: { estado: "PENDIENTE" } });
    if (bancas > 0) {
      tareas.push({
        id: "bancas-pendientes",
        titulo: `${bancas} solicitud${bancas > 1 ? "es" : ""} de banca ciudadana pendiente${bancas > 1 ? "s" : ""}`,
        tipo: "BANCA_CIUDADANA",
        prioridad: "ALTA",
        link: "/admin/participacion",
        fechaLimite: fin,
        automatica: true,
      });
    }

    const ingresados = await prisma.expediente.count({ where: { estado: "INGRESADO" } });
    if (ingresados > 0) {
      tareas.push({
        id: "exp-ingresados",
        titulo: `${ingresados} expediente${ingresados > 1 ? "s" : ""} en mesa de entradas`,
        descripcion: "Revisar y girar a comisión",
        tipo: "EXPEDIENTE",
        prioridad: "NORMAL",
        link: "/admin/expedientes",
        automatica: true,
      });
    }

    const sesionesHoy = await prisma.sesion.findMany({
      where: { fecha: { gte: hoy, lte: fin }, estado: { in: ["PROGRAMADA", "EN_CURSO"] } },
    });
    for (const s of sesionesHoy) {
      tareas.push({
        id: `sec-sesion-${s.id}`,
        titulo: `Gestionar sesión N° ${s.numero}/${s.anio}`,
        descripcion: s.estado === "EN_CURSO" ? "Sesión en curso" : "Preparar orden del día y recinto",
        tipo: "SESION",
        prioridad: s.estado === "EN_CURSO" ? "URGENTE" : "ALTA",
        link: `/admin/sesiones/${s.id}`,
        fechaLimite: s.fecha,
        automatica: true,
      });
    }
  }

  if (role === "SECRETARIO_ADMINISTRATIVO" || role === "ADMIN") {
    const sinUsuario = await prisma.concejal.count({ where: { activo: true, userId: null } });
    if (sinUsuario > 0) {
      tareas.push({
        id: "concejales-sin-usuario",
        titulo: `${sinUsuario} concejal${sinUsuario > 1 ? "es" : ""} sin usuario del sistema`,
        descripcion: "Vincular cuentas para votación y bandeja de trabajo",
        tipo: "GENERAL",
        prioridad: "NORMAL",
        link: "/admin/concejales",
        automatica: true,
      });
    }
  }

  return tareas;
}

async function tareasManuales(userId: string, concejalId?: string | null) {
  return prisma.tarea.findMany({
    where: {
      estado: { in: ["PENDIENTE", "EN_PROCESO"] },
      OR: [{ userId }, ...(concejalId ? [{ concejalId }] : [])],
    },
    orderBy: [{ prioridad: "asc" }, { fechaLimite: "asc" }],
    take: 30,
  });
}

export async function getProyectosConcejal(concejalId: string) {
  const autorias = await prisma.expedienteAutor.findMany({
    where: { concejalId },
    include: { expediente: { include: { bloque: true } } },
    orderBy: { expediente: { fechaIngreso: "desc" } },
    take: 25,
  });
  return autorias.map((a) => a.expediente);
}

export async function getWorkspace(userId: string, role: Role, concejalId?: string | null) {
  const [manual, derivadasConcejal, derivadasSecretario, proyectos, perfil] = await Promise.all([
    tareasManuales(userId, concejalId),
    concejalId ? tareasDerivadasConcejal(concejalId) : Promise.resolve([]),
    tareasDerivadasSecretario(role),
    concejalId ? getProyectosConcejal(concejalId) : Promise.resolve([]),
    concejalId
      ? prisma.concejal.findUnique({
          where: { id: concejalId },
          include: { bloque: true, comisiones: { include: { comision: true } }, foto: true },
        })
      : prisma.user.findUnique({
          where: { id: userId },
          include: { foto: true, bloque: true },
        }),
  ]);

  const manualBandeja: TareaBandeja[] = manual.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion,
    tipo: t.tipo,
    prioridad: t.prioridad,
    link: t.link,
    fechaLimite: t.fechaLimite,
    automatica: false,
    estado: t.estado,
  }));

  const todas = [...manualBandeja, ...derivadasConcejal, ...derivadasSecretario];
  const hoy = todas.filter((t) => esParaHoy(t.fechaLimite));
  const proximas = todas.filter((t) => !esParaHoy(t.fechaLimite));

  const prioridadOrden = { URGENTE: 0, ALTA: 1, NORMAL: 2, BAJA: 3 };
  const ordenar = (a: TareaBandeja, b: TareaBandeja) =>
    prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad];

  return {
    tareasHoy: hoy.sort(ordenar),
    tareasProximas: proximas.sort(ordenar),
    proyectos,
    perfil,
  };
}
