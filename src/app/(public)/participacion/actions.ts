"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const bancaSchema = z.object({
  nombre: z.string().min(2).max(80),
  apellido: z.string().min(2).max(80),
  dni: z.string().regex(/^\d{7,8}$/, "DNI inválido"),
  email: z.string().email(),
  telefono: z.string().max(30).optional().or(z.literal("")),
  tema: z.string().min(5).max(200),
  fundamentacion: z.string().min(20).max(5000),
});

export async function solicitarBanca(formData: FormData) {
  const data = bancaSchema.parse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    dni: formData.get("dni"),
    email: formData.get("email"),
    telefono: formData.get("telefono") ?? "",
    tema: formData.get("tema"),
    fundamentacion: formData.get("fundamentacion"),
  });

  const solicitud = await prisma.solicitudBanca.create({
    data: { ...data, telefono: data.telefono || null },
  });
  await audit({ accion: "SOLICITUD_BANCA", entidad: "SolicitudBanca", entidadId: solicitud.id, datos: { dni: data.dni, tema: data.tema } });
  redirect("/participacion?ok=banca");
}

const inscripcionSchema = z.object({
  audienciaId: z.string().min(1),
  nombre: z.string().min(2).max(80),
  apellido: z.string().min(2).max(80),
  dni: z.string().regex(/^\d{7,8}$/, "DNI inválido"),
  email: z.string().email(),
  postura: z.string().max(2000).optional().or(z.literal("")),
});

export async function inscribirseAudiencia(formData: FormData) {
  const data = inscripcionSchema.parse({
    audienciaId: formData.get("audienciaId"),
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    dni: formData.get("dni"),
    email: formData.get("email"),
    postura: formData.get("postura") ?? "",
  });

  const audiencia = await prisma.audienciaPublica.findUniqueOrThrow({ where: { id: data.audienciaId } });
  if (audiencia.estado !== "INSCRIPCION_ABIERTA") {
    redirect("/participacion?error=inscripcion-cerrada");
  }

  const existente = await prisma.inscripcionAudiencia.findUnique({
    where: { audienciaId_dni: { audienciaId: data.audienciaId, dni: data.dni } },
  });
  if (existente) redirect("/participacion?error=ya-inscripto");

  const inscripcion = await prisma.inscripcionAudiencia.create({
    data: { ...data, postura: data.postura || null },
  });
  await audit({ accion: "INSCRIPCION_AUDIENCIA", entidad: "InscripcionAudiencia", entidadId: inscripcion.id, datos: { audienciaId: data.audienciaId, dni: data.dni } });
  redirect("/participacion?ok=audiencia");
}
