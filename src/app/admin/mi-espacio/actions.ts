"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { hasRole, GESTION_SESIONES } from "@/lib/rbac";
import { PrioridadTarea, TipoTarea } from "@/generated/prisma/client";

const tareaSchema = z.object({
  titulo: z.string().min(3).max(200),
  descripcion: z.string().max(2000).optional().or(z.literal("")),
  tipo: z.nativeEnum(TipoTarea).default(TipoTarea.GENERAL),
  prioridad: z.nativeEnum(PrioridadTarea).default(PrioridadTarea.NORMAL),
  fechaLimite: z.coerce.date().optional(),
  userId: z.string().optional().or(z.literal("")),
  concejalId: z.string().optional().or(z.literal("")),
  link: z.string().max(500).optional().or(z.literal("")),
});

export async function crearTarea(formData: FormData) {
  const user = await requireUser();
  if (!hasRole(user.role, GESTION_SESIONES) && user.role !== "ADMIN") {
    throw new Error("Sin permiso para asignar tareas");
  }

  const data = tareaSchema.parse({
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") ?? "",
    tipo: formData.get("tipo") ?? TipoTarea.GENERAL,
    prioridad: formData.get("prioridad") ?? PrioridadTarea.NORMAL,
    fechaLimite: formData.get("fechaLimite") || undefined,
    userId: formData.get("userId") ?? "",
    concejalId: formData.get("concejalId") ?? "",
    link: formData.get("link") ?? "",
  });

  if (!data.userId && !data.concejalId) throw new Error("Asigná la tarea a un usuario o concejal");

  const tarea = await prisma.tarea.create({
    data: {
      titulo: data.titulo,
      descripcion: data.descripcion || null,
      tipo: data.tipo,
      prioridad: data.prioridad,
      fechaLimite: data.fechaLimite ?? null,
      userId: data.userId || null,
      concejalId: data.concejalId || null,
      link: data.link || null,
      creadoPorId: user.id,
    },
  });

  await audit({ userId: user.id, accion: "CREAR_TAREA", entidad: "Tarea", entidadId: tarea.id, datos: { titulo: data.titulo } });
  revalidatePath("/admin/mi-espacio");
}

export async function completarTarea(id: string) {
  const user = await requireUser();
  const tarea = await prisma.tarea.findUniqueOrThrow({ where: { id } });

  const puede =
    tarea.userId === user.id ||
    (user.concejalId && tarea.concejalId === user.concejalId) ||
    hasRole(user.role, GESTION_SESIONES);

  if (!puede) throw new Error("Sin permiso");

  await prisma.tarea.update({
    where: { id },
    data: { estado: "COMPLETADA", completedAt: new Date() },
  });
  revalidatePath("/admin/mi-espacio");
}
