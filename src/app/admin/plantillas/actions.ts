"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_PORTAL } from "@/lib/rbac";
import { TipoPlantilla } from "@/generated/prisma/client";

const plantillaSchema = z.object({
  nombre: z.string().min(3).max(120),
  tipo: z.nativeEnum(TipoPlantilla),
  contenido: z.string().min(20),
  esDefault: z.coerce.boolean().optional(),
});

export async function crearPlantilla(formData: FormData) {
  const user = await requireRole(GESTION_PORTAL);
  const data = plantillaSchema.parse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo"),
    contenido: formData.get("contenido"),
    esDefault: formData.get("esDefault") === "on",
  });

  if (data.esDefault) {
    await prisma.plantillaDocumento.updateMany({ where: { tipo: data.tipo, esDefault: true }, data: { esDefault: false } });
  }

  const p = await prisma.plantillaDocumento.create({ data });
  await audit({ userId: user.id, accion: "CREAR_PLANTILLA", entidad: "PlantillaDocumento", entidadId: p.id });
  revalidatePath("/admin/plantillas");
}

export async function actualizarPlantilla(id: string, formData: FormData) {
  const user = await requireRole(GESTION_PORTAL);
  const data = plantillaSchema.parse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo"),
    contenido: formData.get("contenido"),
    esDefault: formData.get("esDefault") === "on",
  });

  if (data.esDefault) {
    await prisma.plantillaDocumento.updateMany({ where: { tipo: data.tipo, esDefault: true, NOT: { id } }, data: { esDefault: false } });
  }

  await prisma.plantillaDocumento.update({ where: { id }, data });
  await audit({ userId: user.id, accion: "ACTUALIZAR_PLANTILLA", entidad: "PlantillaDocumento", entidadId: id });
  revalidatePath("/admin/plantillas");
}

export async function alternarPlantilla(id: string) {
  const user = await requireRole(GESTION_PORTAL);
  const p = await prisma.plantillaDocumento.findUniqueOrThrow({ where: { id } });
  await prisma.plantillaDocumento.update({ where: { id }, data: { activa: !p.activa } });
  await audit({ userId: user.id, accion: p.activa ? "DESACTIVAR_PLANTILLA" : "ACTIVAR_PLANTILLA", entidad: "PlantillaDocumento", entidadId: id });
  revalidatePath("/admin/plantillas");
}
