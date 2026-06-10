"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_USUARIOS } from "@/lib/rbac";
import { reemplazarImagen } from "@/lib/imagenes";
import { Role } from "@/generated/prisma/client";

const userSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2).max(120),
  role: z.nativeEnum(Role),
  password: z.string().min(6).optional().or(z.literal("")),
  bloqueId: z.string().optional().or(z.literal("")),
  concejalId: z.string().optional().or(z.literal("")),
  telefono: z.string().max(30).optional().or(z.literal("")),
  celular: z.string().max(30).optional().or(z.literal("")),
});

function parseUser(formData: FormData) {
  return userSchema.parse({
    email: formData.get("email"),
    nombre: formData.get("nombre"),
    role: formData.get("role"),
    password: formData.get("password") ?? "",
    bloqueId: formData.get("bloqueId") ?? "",
    concejalId: formData.get("concejalId") ?? "",
    telefono: formData.get("telefono") ?? "",
    celular: formData.get("celular") ?? "",
  });
}

async function procesarFoto(formData: FormData, fotoIdActual?: string | null) {
  const archivo = formData.get("foto") as File | null;
  return reemplazarImagen(fotoIdActual, archivo);
}

export async function crearUsuario(formData: FormData) {
  const admin = await requireRole(GESTION_USUARIOS);
  const data = parseUser(formData);
  if (!data.password) throw new Error("La contraseña es obligatoria al crear un usuario");

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new Error("Ya existe un usuario con ese email");

  const fotoId = await procesarFoto(formData);
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      nombre: data.nombre,
      role: data.role,
      passwordHash,
      bloqueId: data.bloqueId || null,
      telefono: data.telefono || null,
      celular: data.celular || null,
      fotoId: fotoId ?? null,
    },
  });

  if (data.concejalId) {
    await prisma.concejal.update({
      where: { id: data.concejalId },
      data: { userId: user.id },
    });
  }

  await audit({ userId: admin.id, accion: "CREAR_USUARIO", entidad: "User", entidadId: user.id, datos: { email: data.email, role: data.role } });
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

export async function actualizarUsuario(id: string, formData: FormData) {
  const admin = await requireRole(GESTION_USUARIOS);
  const data = parseUser(formData);
  const actual = await prisma.user.findUniqueOrThrow({ where: { id } });
  const fotoId = await procesarFoto(formData, actual.fotoId);

  const update: {
    nombre: string;
    role: Role;
    bloqueId: string | null;
    telefono: string | null;
    celular: string | null;
    fotoId: string | null;
    passwordHash?: string;
  } = {
    nombre: data.nombre,
    role: data.role,
    bloqueId: data.bloqueId || null,
    telefono: data.telefono || null,
    celular: data.celular || null,
    fotoId: fotoId ?? null,
  };
  if (data.password) update.passwordHash = await bcrypt.hash(data.password, 10);

  await prisma.user.update({ where: { id }, data: update });

  if (data.concejalId) {
    await prisma.concejal.updateMany({ where: { userId: id }, data: { userId: null } });
    await prisma.concejal.update({ where: { id: data.concejalId }, data: { userId: id } });
  }

  await audit({ userId: admin.id, accion: "ACTUALIZAR_USUARIO", entidad: "User", entidadId: id, datos: { role: data.role } });
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

export async function alternarUsuario(id: string) {
  const admin = await requireRole(GESTION_USUARIOS);
  if (admin.id === id) throw new Error("No podés desactivar tu propio usuario");
  const u = await prisma.user.findUniqueOrThrow({ where: { id } });
  await prisma.user.update({ where: { id }, data: { activo: !u.activo } });
  await audit({ userId: admin.id, accion: u.activo ? "DESACTIVAR_USUARIO" : "ACTIVAR_USUARIO", entidad: "User", entidadId: id });
  revalidatePath("/admin/usuarios");
}
