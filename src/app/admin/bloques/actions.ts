"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_INSTITUCIONAL } from "@/lib/rbac";
import { reemplazarImagen } from "@/lib/imagenes";

const bloqueSchema = z.object({
  nombre: z.string().min(2).max(120),
  partido: z.string().min(2).max(120),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  email: z.string().email().optional().or(z.literal("")),
  sitioWeb: z.string().url().optional().or(z.literal("")),
});

function parseBloque(formData: FormData) {
  return bloqueSchema.parse({
    nombre: formData.get("nombre"),
    partido: formData.get("partido"),
    color: formData.get("color"),
    email: formData.get("email") ?? "",
    sitioWeb: formData.get("sitioWeb") ?? "",
  });
}

async function procesarLogo(formData: FormData, logoIdActual?: string | null) {
  const archivo = formData.get("logo") as File | null;
  return reemplazarImagen(logoIdActual, archivo);
}

export async function crearBloque(formData: FormData) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const data = parseBloque(formData);
  const logoId = await procesarLogo(formData);
  const bloque = await prisma.bloque.create({
    data: {
      ...data,
      email: data.email || null,
      sitioWeb: data.sitioWeb || null,
      logoId: logoId ?? null,
    },
  });
  await audit({ userId: user.id, accion: "CREAR", entidad: "Bloque", entidadId: bloque.id, datos: data });
  revalidatePath("/admin/bloques");
  revalidatePath("/concejales");
}

export async function actualizarBloque(id: string, formData: FormData) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const data = parseBloque(formData);
  const actual = await prisma.bloque.findUniqueOrThrow({ where: { id } });
  const logoId = await procesarLogo(formData, actual.logoId);
  await prisma.bloque.update({
    where: { id },
    data: {
      ...data,
      email: data.email || null,
      sitioWeb: data.sitioWeb || null,
      logoId: logoId ?? null,
    },
  });
  await audit({ userId: user.id, accion: "ACTUALIZAR", entidad: "Bloque", entidadId: id, datos: data });
  revalidatePath("/admin/bloques");
  revalidatePath("/concejales");
}

export async function alternarBloque(id: string) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const bloque = await prisma.bloque.findUniqueOrThrow({ where: { id } });
  await prisma.bloque.update({ where: { id }, data: { activo: !bloque.activo } });
  await audit({ userId: user.id, accion: bloque.activo ? "DESACTIVAR" : "ACTIVAR", entidad: "Bloque", entidadId: id });
  revalidatePath("/admin/bloques");
  revalidatePath("/concejales");
}
