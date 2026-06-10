"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_INSTITUCIONAL } from "@/lib/rbac";
import { reemplazarImagen } from "@/lib/imagenes";
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
  telefono: z.string().max(30).optional().or(z.literal("")),
  celular: z.string().max(30).optional().or(z.literal("")),
  emailUsuario: z.string().email().optional().or(z.literal("")),
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
    telefono: formData.get("telefono") ?? "",
    celular: formData.get("celular") ?? "",
    emailUsuario: formData.get("emailUsuario") ?? "",
  });
}

async function procesarFoto(formData: FormData, fotoIdActual?: string | null) {
  const archivo = formData.get("foto") as File | null;
  return reemplazarImagen(fotoIdActual, archivo);
}

export async function crearConcejal(formData: FormData) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const { emailUsuario, email, ...data } = parseConcejal(formData);
  const fotoId = await procesarFoto(formData);

  const emailCuenta = emailUsuario || email;
  let userId: string | undefined;
  if (emailCuenta) {
    const passwordHash = await bcrypt.hash(data.dni, 10);
    const nuevoUser = await prisma.user.create({
      data: {
        email: emailCuenta,
        passwordHash,
        nombre: `${data.nombre} ${data.apellido}`,
        role: Role.CONCEJAL,
        bloqueId: data.bloqueId,
        telefono: data.telefono || null,
        celular: data.celular || null,
      },
    });
    userId = nuevoUser.id;
  }

  const concejal = await prisma.concejal.create({
    data: {
      ...data,
      email: email || null,
      telefono: data.telefono || null,
      celular: data.celular || null,
      biografia: data.biografia || null,
      fotoUrl: data.fotoUrl || null,
      fotoId: fotoId ?? null,
      userId,
    },
  });
  await audit({ userId: user.id, accion: "CREAR", entidad: "Concejal", entidadId: concejal.id, datos: { ...data, email } });
  revalidatePath("/admin/concejales");
  revalidatePath("/concejales");
  redirect("/admin/concejales");
}

export async function actualizarConcejal(id: string, formData: FormData) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const { emailUsuario: _eu, ...data } = parseConcejal(formData);
  const actual = await prisma.concejal.findUniqueOrThrow({ where: { id } });
  const fotoId = await procesarFoto(formData, actual.fotoId);

  await prisma.concejal.update({
    where: { id },
    data: {
      ...data,
      email: data.email || null,
      telefono: data.telefono || null,
      celular: data.celular || null,
      biografia: data.biografia || null,
      fotoUrl: data.fotoUrl || null,
      fotoId: fotoId ?? null,
    },
  });

  if (actual.userId) {
    await prisma.user.update({
      where: { id: actual.userId },
      data: {
        telefono: data.telefono || null,
        celular: data.celular || null,
      },
    });
  }

  await audit({ userId: user.id, accion: "ACTUALIZAR", entidad: "Concejal", entidadId: id, datos: data });
  revalidatePath("/admin/concejales");
  revalidatePath(`/concejales/${id}`);
  redirect("/admin/concejales");
}

export async function alternarConcejal(id: string) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const c = await prisma.concejal.findUniqueOrThrow({ where: { id } });
  await prisma.concejal.update({ where: { id }, data: { activo: !c.activo } });
  await audit({ userId: user.id, accion: c.activo ? "DESACTIVAR" : "ACTIVAR", entidad: "Concejal", entidadId: id });
  revalidatePath("/admin/concejales");
  revalidatePath("/concejales");
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
