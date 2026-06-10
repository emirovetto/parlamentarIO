"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_INSTITUCIONAL } from "@/lib/rbac";
import { CargoAutoridad, Role } from "@/generated/prisma/client";

const concejalSchema = z.object({
  nombre: z.string().min(2).max(80),
  apellido: z.string().min(2).max(80),
  dni: z.string().regex(/^\d{7,8}$/, "DNI inválido"),
  partido: z.string().min(2).max(120),
  bloqueId: z.string().min(1),
  mandatoInicio: z.coerce.date(),
  mandatoFin: z.coerce.date(),
  biografia: z.string().max(5000).optional().or(z.literal("")),
  fotoUrl: z.string().url().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
});

function parseConcejal(formData: FormData) {
  return concejalSchema.parse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    dni: formData.get("dni"),
    partido: formData.get("partido"),
    bloqueId: formData.get("bloqueId"),
    mandatoInicio: formData.get("mandatoInicio"),
    mandatoFin: formData.get("mandatoFin"),
    biografia: formData.get("biografia") ?? "",
    fotoUrl: formData.get("fotoUrl") ?? "",
    email: formData.get("email") ?? "",
  });
}

export async function crearConcejal(formData: FormData) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const { email, ...data } = parseConcejal(formData);

  let userId: string | undefined;
  if (email) {
    // Crea usuario con rol CONCEJAL y contraseña temporal (el DNI)
    const passwordHash = await bcrypt.hash(data.dni, 10);
    const nuevoUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        nombre: `${data.nombre} ${data.apellido}`,
        role: Role.CONCEJAL,
        bloqueId: data.bloqueId,
      },
    });
    userId = nuevoUser.id;
  }

  const concejal = await prisma.concejal.create({
    data: {
      ...data,
      biografia: data.biografia || null,
      fotoUrl: data.fotoUrl || null,
      userId,
    },
  });
  await audit({ userId: user.id, accion: "CREAR", entidad: "Concejal", entidadId: concejal.id, datos: { ...data, email } });
  revalidatePath("/admin/concejales");
  redirect("/admin/concejales");
}

export async function actualizarConcejal(id: string, formData: FormData) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const { email: _email, ...data } = parseConcejal(formData);
  await prisma.concejal.update({
    where: { id },
    data: { ...data, biografia: data.biografia || null, fotoUrl: data.fotoUrl || null },
  });
  await audit({ userId: user.id, accion: "ACTUALIZAR", entidad: "Concejal", entidadId: id, datos: data });
  revalidatePath("/admin/concejales");
  redirect("/admin/concejales");
}

export async function alternarConcejal(id: string) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const c = await prisma.concejal.findUniqueOrThrow({ where: { id } });
  await prisma.concejal.update({ where: { id }, data: { activo: !c.activo } });
  await audit({ userId: user.id, accion: c.activo ? "DESACTIVAR" : "ACTIVAR", entidad: "Concejal", entidadId: id });
  revalidatePath("/admin/concejales");
}

const autoridadSchema = z.object({
  cargo: z.nativeEnum(CargoAutoridad),
  concejalId: z.string().min(1),
});

export async function asignarAutoridad(formData: FormData) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const data = autoridadSchema.parse({
    cargo: formData.get("cargo"),
    concejalId: formData.get("concejalId"),
  });
  // Cierra el mandato vigente para ese cargo, si existe
  await prisma.autoridad.updateMany({
    where: { cargo: data.cargo, hasta: null },
    data: { hasta: new Date() },
  });
  const autoridad = await prisma.autoridad.create({
    data: { ...data, desde: new Date() },
  });
  await audit({ userId: user.id, accion: "ASIGNAR_AUTORIDAD", entidad: "Autoridad", entidadId: autoridad.id, datos: data });
  revalidatePath("/admin/concejales");
}
