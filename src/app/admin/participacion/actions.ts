"use server";

import { z } from "zod";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_PARTICIPACION } from "@/lib/rbac";
import { EstadoSolicitud, EstadoAudiencia } from "@/generated/prisma/client";

export async function resolverSolicitudBanca(solicitudId: string, formData: FormData) {
  const user = await requireRole(GESTION_PARTICIPACION);
  const data = z
    .object({
      estado: z.nativeEnum(EstadoSolicitud),
      sesionId: z.string().optional().or(z.literal("")),
      respuesta: z.string().max(2000).optional().or(z.literal("")),
    })
    .parse({
      estado: formData.get("estado"),
      sesionId: formData.get("sesionId") ?? "",
      respuesta: formData.get("respuesta") ?? "",
    });

  await prisma.solicitudBanca.update({
    where: { id: solicitudId },
    data: { estado: data.estado, sesionId: data.sesionId || null, respuesta: data.respuesta || null },
  });
  await audit({ userId: user.id, accion: `BANCA_${data.estado}`, entidad: "SolicitudBanca", entidadId: solicitudId, datos: data });
  revalidatePath("/admin/participacion");
}

export async function crearAudiencia(formData: FormData) {
  const user = await requireRole(GESTION_PARTICIPACION);
  const data = z
    .object({
      titulo: z.string().min(5).max(200),
      descripcion: z.string().min(10).max(5000),
      fecha: z.coerce.date(),
      lugar: z.string().min(3).max(200),
    })
    .parse({
      titulo: formData.get("titulo"),
      descripcion: formData.get("descripcion"),
      fecha: formData.get("fecha"),
      lugar: formData.get("lugar"),
    });

  const audiencia = await prisma.audienciaPublica.create({ data });
  await audit({ userId: user.id, accion: "CREAR_AUDIENCIA", entidad: "AudienciaPublica", entidadId: audiencia.id, datos: { titulo: data.titulo } });
  revalidatePath("/admin/participacion");
  revalidatePath("/participacion");
}

export async function cambiarEstadoAudiencia(audienciaId: string, estado: EstadoAudiencia) {
  const user = await requireRole(GESTION_PARTICIPACION);
  await prisma.audienciaPublica.update({ where: { id: audienciaId }, data: { estado } });
  await audit({ userId: user.id, accion: `AUDIENCIA_${estado}`, entidad: "AudienciaPublica", entidadId: audienciaId });
  revalidatePath("/admin/participacion");
  revalidatePath("/participacion");
}

export async function cargarResolucionAudiencia(audienciaId: string, formData: FormData) {
  const user = await requireRole(GESTION_PARTICIPACION);
  const resolucion = z.string().min(5).max(10000).parse(formData.get("resolucion"));
  await prisma.audienciaPublica.update({ where: { id: audienciaId }, data: { resolucion, estado: EstadoAudiencia.REALIZADA } });
  await audit({ userId: user.id, accion: "RESOLUCION_AUDIENCIA", entidad: "AudienciaPublica", entidadId: audienciaId });
  revalidatePath("/admin/participacion");
  revalidatePath("/participacion");
}

const MAX_PDF_BYTES = 4 * 1024 * 1024;

export async function subirMaterialAudiencia(audienciaId: string, formData: FormData) {
  const user = await requireRole(GESTION_PARTICIPACION);
  const archivo = formData.get("archivo") as File | null;
  if (!archivo || archivo.size === 0) throw new Error("Archivo requerido");
  if (archivo.size > MAX_PDF_BYTES) throw new Error("El archivo supera el máximo de 4 MB");
  if (archivo.type !== "application/pdf") throw new Error("Solo se admiten PDF");

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const hashSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  await prisma.documento.create({
    data: {
      nombre: archivo.name,
      mime: archivo.type,
      datos: buffer,
      hashSha256,
      tamanio: archivo.size,
      audienciaId,
      publico: true,
      subidoPorId: user.id,
    },
  });
  await audit({ userId: user.id, accion: "MATERIAL_AUDIENCIA", entidad: "AudienciaPublica", entidadId: audienciaId, datos: { nombre: archivo.name, hashSha256 } });
  revalidatePath("/admin/participacion");
  revalidatePath("/participacion");
}
