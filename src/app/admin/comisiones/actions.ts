"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_INSTITUCIONAL, GESTION_EXPEDIENTES } from "@/lib/rbac";
import { RolComision } from "@/generated/prisma/client";

export async function crearComision(formData: FormData) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const data = z
    .object({ nombre: z.string().min(3).max(150), descripcion: z.string().max(1000).optional().or(z.literal("")) })
    .parse({ nombre: formData.get("nombre"), descripcion: formData.get("descripcion") ?? "" });
  const comision = await prisma.comision.create({
    data: { nombre: data.nombre, descripcion: data.descripcion || null },
  });
  await audit({ userId: user.id, accion: "CREAR", entidad: "Comision", entidadId: comision.id, datos: data });
  revalidatePath("/admin/comisiones");
}

export async function agregarMiembro(comisionId: string, formData: FormData) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const data = z
    .object({ concejalId: z.string().min(1), rol: z.nativeEnum(RolComision) })
    .parse({ concejalId: formData.get("concejalId"), rol: formData.get("rol") });
  await prisma.comisionMiembro.upsert({
    where: { comisionId_concejalId: { comisionId, concejalId: data.concejalId } },
    update: { rol: data.rol },
    create: { comisionId, ...data },
  });
  await audit({ userId: user.id, accion: "AGREGAR_MIEMBRO", entidad: "Comision", entidadId: comisionId, datos: data });
  revalidatePath(`/admin/comisiones/${comisionId}`);
}

export async function quitarMiembro(comisionId: string, miembroId: string) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  await prisma.comisionMiembro.delete({ where: { id: miembroId } });
  await audit({ userId: user.id, accion: "QUITAR_MIEMBRO", entidad: "Comision", entidadId: comisionId, datos: { miembroId } });
  revalidatePath(`/admin/comisiones/${comisionId}`);
}

export async function convocarReunion(comisionId: string, formData: FormData) {
  const user = await requireRole(GESTION_EXPEDIENTES);
  const data = z
    .object({ fecha: z.coerce.date(), ordenDelDia: z.string().min(3).max(10000) })
    .parse({ fecha: formData.get("fecha"), ordenDelDia: formData.get("ordenDelDia") });
  const reunion = await prisma.reunionComision.create({ data: { comisionId, ...data } });
  await audit({ userId: user.id, accion: "CONVOCAR_REUNION", entidad: "ReunionComision", entidadId: reunion.id, datos: { comisionId, fecha: data.fecha.toISOString() } });
  revalidatePath(`/admin/comisiones/${comisionId}`);
}

export async function cargarActaReunion(reunionId: string, comisionId: string, formData: FormData) {
  const user = await requireRole(GESTION_EXPEDIENTES);
  const acta = z.string().min(3).max(50000).parse(formData.get("acta"));
  await prisma.reunionComision.update({ where: { id: reunionId }, data: { acta } });
  await audit({ userId: user.id, accion: "CARGAR_ACTA", entidad: "ReunionComision", entidadId: reunionId });
  revalidatePath(`/admin/comisiones/${comisionId}`);
}
