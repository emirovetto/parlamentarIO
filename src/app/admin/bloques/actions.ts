"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_INSTITUCIONAL } from "@/lib/rbac";

const bloqueSchema = z.object({
  nombre: z.string().min(2).max(120),
  partido: z.string().min(2).max(120),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function crearBloque(formData: FormData) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const data = bloqueSchema.parse({
    nombre: formData.get("nombre"),
    partido: formData.get("partido"),
    color: formData.get("color"),
  });
  const bloque = await prisma.bloque.create({ data });
  await audit({ userId: user.id, accion: "CREAR", entidad: "Bloque", entidadId: bloque.id, datos: data });
  revalidatePath("/admin/bloques");
}

export async function actualizarBloque(id: string, formData: FormData) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const data = bloqueSchema.parse({
    nombre: formData.get("nombre"),
    partido: formData.get("partido"),
    color: formData.get("color"),
  });
  await prisma.bloque.update({ where: { id }, data });
  await audit({ userId: user.id, accion: "ACTUALIZAR", entidad: "Bloque", entidadId: id, datos: data });
  revalidatePath("/admin/bloques");
}

export async function alternarBloque(id: string) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const bloque = await prisma.bloque.findUniqueOrThrow({ where: { id } });
  await prisma.bloque.update({ where: { id }, data: { activo: !bloque.activo } });
  await audit({ userId: user.id, accion: bloque.activo ? "DESACTIVAR" : "ACTIVAR", entidad: "Bloque", entidadId: id });
  revalidatePath("/admin/bloques");
}
