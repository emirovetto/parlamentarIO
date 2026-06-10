"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole, requireUser } from "@/lib/session";
import { GESTION_SESIONES, PUEDE_VOTAR } from "@/lib/rbac";
import { EstadoExpediente, EstadoSesion, TipoSesion, TipoVotacion, MayoriaRequerida, ValorVoto } from "@/generated/prisma/client";

// ── Gestión de sesiones ──

export async function crearSesion(formData: FormData) {
  const user = await requireRole(GESTION_SESIONES);
  const data = z
    .object({ tipo: z.nativeEnum(TipoSesion), fecha: z.coerce.date() })
    .parse({ tipo: formData.get("tipo"), fecha: formData.get("fecha") });

  const anio = data.fecha.getFullYear();
  const ultima = await prisma.sesion.findFirst({ where: { anio }, orderBy: { numero: "desc" } });
  const sesion = await prisma.sesion.create({
    data: { numero: (ultima?.numero ?? 0) + 1, anio, ...data },
  });
  await audit({ userId: user.id, accion: "CREAR", entidad: "Sesion", entidadId: sesion.id, datos: { numero: sesion.numero, anio } });
  redirect(`/admin/sesiones/${sesion.id}`);
}

export async function publicarSesion(sesionId: string) {
  const user = await requireRole(GESTION_SESIONES);
  await prisma.sesion.update({ where: { id: sesionId }, data: { publicada: true } });
  // Los expedientes con dictamen incluidos pasan a "En Orden del Día"
  const puntos = await prisma.puntoOrdenDelDia.findMany({ where: { sesionId, expedienteId: { not: null } }, include: { expediente: true } });
  for (const p of puntos) {
    if (p.expediente && p.expediente.estado === EstadoExpediente.CON_DICTAMEN) {
      await prisma.$transaction([
        prisma.expediente.update({ where: { id: p.expediente.id }, data: { estado: EstadoExpediente.EN_ORDEN_DEL_DIA } }),
        prisma.movimientoExpediente.create({
          data: { expedienteId: p.expediente.id, estadoDesde: p.expediente.estado, estadoHasta: EstadoExpediente.EN_ORDEN_DEL_DIA, observacion: "Incluido en Orden del Día publicado", usuario: user.name },
        }),
      ]);
    }
  }
  await audit({ userId: user.id, accion: "PUBLICAR_ORDEN_DEL_DIA", entidad: "Sesion", entidadId: sesionId });
  revalidatePath(`/admin/sesiones/${sesionId}`);
}

export async function agregarPunto(sesionId: string, formData: FormData) {
  const user = await requireRole(GESTION_SESIONES);
  const data = z
    .object({ titulo: z.string().min(3).max(300), dictamenId: z.string().optional().or(z.literal("")) })
    .parse({ titulo: formData.get("titulo"), dictamenId: formData.get("dictamenId") ?? "" });

  const count = await prisma.puntoOrdenDelDia.count({ where: { sesionId } });
  let expedienteId: string | null = null;
  if (data.dictamenId) {
    const dictamen = await prisma.dictamen.findUniqueOrThrow({ where: { id: data.dictamenId } });
    expedienteId = dictamen.expedienteId;
  }
  await prisma.puntoOrdenDelDia.create({
    data: { sesionId, orden: count + 1, titulo: data.titulo, dictamenId: data.dictamenId || null, expedienteId },
  });
  await audit({ userId: user.id, accion: "AGREGAR_PUNTO", entidad: "Sesion", entidadId: sesionId, datos: { titulo: data.titulo } });
  revalidatePath(`/admin/sesiones/${sesionId}`);
}

export async function eliminarPunto(sesionId: string, puntoId: string) {
  const user = await requireRole(GESTION_SESIONES);
  await prisma.puntoOrdenDelDia.delete({ where: { id: puntoId } });
  await audit({ userId: user.id, accion: "ELIMINAR_PUNTO", entidad: "Sesion", entidadId: sesionId, datos: { puntoId } });
  revalidatePath(`/admin/sesiones/${sesionId}`);
}

export async function reordenarPuntos(sesionId: string, ordenIds: string[]) {
  const user = await requireRole(GESTION_SESIONES);
  await prisma.$transaction(
    ordenIds.map((id, idx) =>
      prisma.puntoOrdenDelDia.update({ where: { id }, data: { orden: idx + 1 } }),
    ),
  );
  await audit({ userId: user.id, accion: "REORDENAR_PUNTOS", entidad: "Sesion", entidadId: sesionId });
  revalidatePath(`/admin/sesiones/${sesionId}`);
}

export async function cambiarEstadoSesion(sesionId: string, estado: EstadoSesion) {
  const user = await requireRole(GESTION_SESIONES);
  const extra: { horaInicioReal?: Date; horaFinReal?: Date } = {};
  if (estado === EstadoSesion.EN_CURSO) extra.horaInicioReal = new Date();
  if (estado === EstadoSesion.FINALIZADA) extra.horaFinReal = new Date();
  await prisma.sesion.update({ where: { id: sesionId }, data: { estado, ...extra } });
  await audit({ userId: user.id, accion: `SESION_${estado}`, entidad: "Sesion", entidadId: sesionId });
  revalidatePath(`/admin/sesiones/${sesionId}`);
  revalidatePath(`/admin/sesiones/${sesionId}/vivo`);
  revalidatePath("/sesiones");
  revalidatePath("/");
}

/** Link de YouTube de la transmisión en vivo (visible en portal mientras la sesión está EN_CURSO). */
export async function guardarTransmisionEnVivo(sesionId: string, formData: FormData) {
  const user = await requireRole(GESTION_SESIONES);
  const videoEnVivoUrl = z.string().url().parse(formData.get("videoEnVivoUrl"));
  await prisma.sesion.update({ where: { id: sesionId }, data: { videoEnVivoUrl } });
  await audit({ userId: user.id, accion: "GUARDAR_TRANSMISION_VIVO", entidad: "Sesion", entidadId: sesionId, datos: { videoEnVivoUrl } });
  revalidatePath(`/admin/sesiones/${sesionId}`);
  revalidatePath(`/admin/sesiones/${sesionId}/vivo`);
  revalidatePath("/sesiones");
  revalidatePath("/");
}

export async function guardarActaYVideo(sesionId: string, formData: FormData) {
  const user = await requireRole(GESTION_SESIONES);
  const data = z
    .object({
      acta: z.string().optional().or(z.literal("")),
      videoUrl: z.string().url().optional().or(z.literal("")),
      notasPostSesion: z.string().max(10000).optional().or(z.literal("")),
    })
    .parse({
      acta: formData.get("acta") ?? "",
      videoUrl: formData.get("videoUrl") ?? "",
      notasPostSesion: formData.get("notasPostSesion") ?? "",
    });
  await prisma.sesion.update({
    where: { id: sesionId },
    data: {
      acta: data.acta || null,
      videoUrl: data.videoUrl || null,
      notasPostSesion: data.notasPostSesion || null,
    },
  });
  await audit({ userId: user.id, accion: "GUARDAR_ACTA", entidad: "Sesion", entidadId: sesionId });
  revalidatePath(`/admin/sesiones/${sesionId}`);
  revalidatePath(`/sesiones/${sesionId}`);
}

/**
 * Archiva la sesión: pasa el link en vivo a grabación si no hay video archivado,
 * marca archivada=true y la deja visible en el historial público.
 */
export async function archivarSesion(sesionId: string, formData: FormData) {
  const user = await requireRole(GESTION_SESIONES);
  const videoArchivado = z.string().url().optional().or(z.literal("")).parse(formData.get("videoUrl") ?? "");
  const sesion = await prisma.sesion.findUniqueOrThrow({ where: { id: sesionId } });

  const videoUrl = videoArchivado || sesion.videoUrl || sesion.videoEnVivoUrl || null;

  await prisma.sesion.update({
    where: { id: sesionId },
    data: {
      videoUrl,
      videoEnVivoUrl: null,
      archivada: true,
      publicada: true,
      estado: EstadoSesion.FINALIZADA,
      horaFinReal: sesion.horaFinReal ?? new Date(),
    },
  });
  await audit({ userId: user.id, accion: "ARCHIVAR_SESION", entidad: "Sesion", entidadId: sesionId, datos: { videoUrl } });
  revalidatePath(`/admin/sesiones/${sesionId}`);
  revalidatePath("/sesiones");
  revalidatePath(`/sesiones/${sesionId}`);
}

export async function marcarTimestampPunto(puntoId: string, sesionId: string, formData: FormData) {
  const user = await requireRole(GESTION_SESIONES);
  const videoTimestamp = z.string().max(20).parse(formData.get("videoTimestamp"));
  await prisma.puntoOrdenDelDia.update({ where: { id: puntoId }, data: { videoTimestamp } });
  await audit({ userId: user.id, accion: "MARCAR_TIMESTAMP", entidad: "PuntoOrdenDelDia", entidadId: puntoId });
  revalidatePath(`/admin/sesiones/${sesionId}`);
}

// ── Recinto digital: asistencia, mociones, palabra ──

export async function marcarAsistencia(sesionId: string, concejalId: string, presente: boolean) {
  const user = await requireRole(GESTION_SESIONES);
  await prisma.asistencia.upsert({
    where: { sesionId_concejalId: { sesionId, concejalId } },
    update: { presente, horaMarca: new Date() },
    create: { sesionId, concejalId, presente },
  });
  await audit({ userId: user.id, accion: presente ? "PRESENTE" : "AUSENTE", entidad: "Asistencia", entidadId: `${sesionId}:${concejalId}` });
  revalidatePath(`/admin/sesiones/${sesionId}/vivo`);
}

export async function registrarMocion(sesionId: string, formData: FormData) {
  const user = await requireRole(GESTION_SESIONES);
  const data = z
    .object({ texto: z.string().min(3).max(2000), presentadaPor: z.string().min(2).max(150) })
    .parse({ texto: formData.get("texto"), presentadaPor: formData.get("presentadaPor") });
  await prisma.mocion.create({ data: { sesionId, ...data } });
  await audit({ userId: user.id, accion: "REGISTRAR_MOCION", entidad: "Sesion", entidadId: sesionId, datos: data });
  revalidatePath(`/admin/sesiones/${sesionId}/vivo`);
}

export async function resolverMocion(mocionId: string, sesionId: string, aprobada: boolean) {
  const user = await requireRole(GESTION_SESIONES);
  await prisma.mocion.update({ where: { id: mocionId }, data: { aprobada } });
  await audit({ userId: user.id, accion: aprobada ? "MOCION_APROBADA" : "MOCION_RECHAZADA", entidad: "Mocion", entidadId: mocionId });
  revalidatePath(`/admin/sesiones/${sesionId}/vivo`);
}

export async function iniciarUsoPalabra(sesionId: string, formData: FormData) {
  const user = await requireRole(GESTION_SESIONES);
  const concejalId = z.string().min(1).parse(formData.get("concejalId"));
  // Cierra cualquier uso de palabra abierto
  await cerrarPalabraAbierta(sesionId);
  await prisma.usoPalabra.create({ data: { sesionId, concejalId } });
  await audit({ userId: user.id, accion: "DAR_PALABRA", entidad: "Sesion", entidadId: sesionId, datos: { concejalId } });
  revalidatePath(`/admin/sesiones/${sesionId}/vivo`);
}

export async function finalizarUsoPalabra(sesionId: string) {
  const user = await requireRole(GESTION_SESIONES);
  await cerrarPalabraAbierta(sesionId);
  await audit({ userId: user.id, accion: "QUITAR_PALABRA", entidad: "Sesion", entidadId: sesionId });
  revalidatePath(`/admin/sesiones/${sesionId}/vivo`);
}

async function cerrarPalabraAbierta(sesionId: string) {
  const abierta = await prisma.usoPalabra.findFirst({ where: { sesionId, duracionSegundos: null } });
  if (abierta) {
    const duracion = Math.round((Date.now() - abierta.inicio.getTime()) / 1000);
    await prisma.usoPalabra.update({ where: { id: abierta.id }, data: { duracionSegundos: duracion } });
  }
}

// ── Votación electrónica ──

export async function abrirVotacion(sesionId: string, formData: FormData) {
  const user = await requireRole(GESTION_SESIONES);
  const data = z
    .object({
      titulo: z.string().min(3).max(300),
      tipo: z.nativeEnum(TipoVotacion),
      mayoria: z.nativeEnum(MayoriaRequerida),
      puntoId: z.string().optional().or(z.literal("")),
    })
    .parse({
      titulo: formData.get("titulo"),
      tipo: formData.get("tipo"),
      mayoria: formData.get("mayoria"),
      puntoId: formData.get("puntoId") ?? "",
    });

  const abiertas = await prisma.votacion.count({ where: { sesionId, abierta: true } });
  if (abiertas > 0) throw new Error("Ya hay una votación abierta en esta sesión");

  const votacion = await prisma.votacion.create({
    data: { sesionId, titulo: data.titulo, tipo: data.tipo, mayoria: data.mayoria, puntoId: data.puntoId || null },
  });
  await audit({ userId: user.id, accion: "ABRIR_VOTACION", entidad: "Votacion", entidadId: votacion.id, datos: data });
  revalidatePath(`/admin/sesiones/${sesionId}/vivo`);
  revalidatePath("/admin/votar");
}

export async function emitirVoto(votacionId: string, valor: ValorVoto) {
  const user = await requireUser();
  if (!user.concejalId) throw new Error("Solo los concejales pueden votar");

  const votacion = await prisma.votacion.findUniqueOrThrow({ where: { id: votacionId } });
  if (!votacion.abierta) throw new Error("La votación está cerrada");

  // Debe estar presente en la sesión
  const asistencia = await prisma.asistencia.findUnique({
    where: { sesionId_concejalId: { sesionId: votacion.sesionId, concejalId: user.concejalId } },
  });
  if (!asistencia?.presente) throw new Error("Debés estar registrado como presente para votar");

  await prisma.voto.upsert({
    where: { votacionId_concejalId: { votacionId, concejalId: user.concejalId } },
    update: { valor, emitidoEn: new Date() },
    create: { votacionId, concejalId: user.concejalId, valor },
  });
  await audit({ userId: user.id, accion: "VOTAR", entidad: "Votacion", entidadId: votacionId, datos: { valor } });
  revalidatePath("/admin/votar");
  revalidatePath(`/admin/sesiones/${votacion.sesionId}/vivo`);
}

/**
 * Cierra la votación y computa el resultado según la mayoría requerida:
 * - SIMPLE: afirmativos > negativos
 * - ABSOLUTA: afirmativos > mitad de los miembros del cuerpo
 * - DOS_TERCIOS: afirmativos >= 2/3 de los presentes
 */
export async function cerrarVotacion(votacionId: string) {
  const user = await requireRole(GESTION_SESIONES);
  const votacion = await prisma.votacion.findUniqueOrThrow({
    where: { id: votacionId },
    include: { votos: true, punto: true },
  });
  if (!votacion.abierta) return;

  const afirmativos = votacion.votos.filter((v) => v.valor === ValorVoto.AFIRMATIVO).length;
  const negativos = votacion.votos.filter((v) => v.valor === ValorVoto.NEGATIVO).length;
  const abstenciones = votacion.votos.filter((v) => v.valor === ValorVoto.ABSTENCION).length;

  const [presentes, miembrosCuerpo] = await Promise.all([
    prisma.asistencia.count({ where: { sesionId: votacion.sesionId, presente: true } }),
    prisma.concejal.count({ where: { activo: true } }),
  ]);

  let aprobada: boolean;
  switch (votacion.mayoria) {
    case MayoriaRequerida.ABSOLUTA:
      aprobada = afirmativos > miembrosCuerpo / 2;
      break;
    case MayoriaRequerida.DOS_TERCIOS:
      aprobada = presentes > 0 && afirmativos >= Math.ceil((presentes * 2) / 3);
      break;
    default:
      aprobada = afirmativos > negativos;
  }

  const resultado = `Afirmativos: ${afirmativos} · Negativos: ${negativos} · Abstenciones: ${abstenciones} · Presentes: ${presentes}`;

  await prisma.votacion.update({
    where: { id: votacionId },
    data: { abierta: false, aprobada, resultado, cerradaEn: new Date() },
  });

  // Si la votación corresponde a un punto con expediente, actualiza su estado
  if (votacion.punto?.expedienteId) {
    const exp = await prisma.expediente.findUniqueOrThrow({ where: { id: votacion.punto.expedienteId } });
    if (exp.estado === EstadoExpediente.EN_ORDEN_DEL_DIA) {
      const nuevoEstado = aprobada ? EstadoExpediente.APROBADO : EstadoExpediente.RECHAZADO;
      await prisma.$transaction([
        prisma.expediente.update({ where: { id: exp.id }, data: { estado: nuevoEstado } }),
        prisma.movimientoExpediente.create({
          data: { expedienteId: exp.id, estadoDesde: exp.estado, estadoHasta: nuevoEstado, observacion: `Votación: ${resultado}`, usuario: user.name },
        }),
        prisma.puntoOrdenDelDia.update({ where: { id: votacion.punto.id }, data: { tratado: true } }),
      ]);
    }
  }

  await audit({ userId: user.id, accion: "CERRAR_VOTACION", entidad: "Votacion", entidadId: votacionId, datos: { aprobada, resultado } });
  revalidatePath(`/admin/sesiones/${votacion.sesionId}/vivo`);
  revalidatePath("/admin/votar");
}
