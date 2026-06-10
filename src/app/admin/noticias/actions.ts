"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_PORTAL } from "@/lib/rbac";
import { reemplazarImagen } from "@/lib/imagenes";
import { slugify } from "@/lib/slug";
import { CategoriaNoticia } from "@/generated/prisma/client";

const noticiaSchema = z.object({
  titulo: z.string().min(5).max(200),
  resumen: z.string().max(500).optional().or(z.literal("")),
  cuerpo: z.string().min(20),
  categoria: z.nativeEnum(CategoriaNoticia),
  publicada: z.coerce.boolean().optional(),
  destacada: z.coerce.boolean().optional(),
});

async function slugUnico(titulo: string, excludeId?: string) {
  let slug = slugify(titulo);
  let n = 0;
  while (true) {
    const candidate = n ? `${slug}-${n}` : slug;
    const exists = await prisma.noticia.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (!exists) return candidate;
    n++;
  }
}

export async function crearNoticia(formData: FormData) {
  const user = await requireRole(GESTION_PORTAL);
  const data = noticiaSchema.parse({
    titulo: formData.get("titulo"),
    resumen: formData.get("resumen") ?? "",
    cuerpo: formData.get("cuerpo"),
    categoria: formData.get("categoria"),
    publicada: formData.get("publicada") === "on",
    destacada: formData.get("destacada") === "on",
  });
  const imagenId = await reemplazarImagen(null, formData.get("imagen") as File | null);
  const slug = await slugUnico(data.titulo);

  const noticia = await prisma.noticia.create({
    data: {
      ...data,
      slug,
      resumen: data.resumen || null,
      imagenId: imagenId ?? null,
      autorId: user.id,
      publicadaEn: data.publicada ? new Date() : null,
    },
  });
  await audit({ userId: user.id, accion: "CREAR_NOTICIA", entidad: "Noticia", entidadId: noticia.id });
  revalidatePath("/noticias");
  revalidatePath("/");
  redirect("/admin/noticias");
}

export async function actualizarNoticia(id: string, formData: FormData) {
  const user = await requireRole(GESTION_PORTAL);
  const data = noticiaSchema.parse({
    titulo: formData.get("titulo"),
    resumen: formData.get("resumen") ?? "",
    cuerpo: formData.get("cuerpo"),
    categoria: formData.get("categoria"),
    publicada: formData.get("publicada") === "on",
    destacada: formData.get("destacada") === "on",
  });
  const actual = await prisma.noticia.findUniqueOrThrow({ where: { id } });
  const imagenId = await reemplazarImagen(actual.imagenId, formData.get("imagen") as File | null);
  const slug = actual.titulo === data.titulo ? actual.slug : await slugUnico(data.titulo, id);

  await prisma.noticia.update({
    where: { id },
    data: {
      ...data,
      slug,
      resumen: data.resumen || null,
      imagenId: imagenId ?? null,
      publicadaEn: data.publicada && !actual.publicada ? new Date() : actual.publicadaEn,
    },
  });
  await audit({ userId: user.id, accion: "ACTUALIZAR_NOTICIA", entidad: "Noticia", entidadId: id });
  revalidatePath("/noticias");
  revalidatePath(`/noticias/${slug}`);
  revalidatePath("/");
  redirect("/admin/noticias");
}

export async function eliminarNoticia(id: string) {
  const user = await requireRole(GESTION_PORTAL);
  await prisma.noticia.delete({ where: { id } });
  await audit({ userId: user.id, accion: "ELIMINAR_NOTICIA", entidad: "Noticia", entidadId: id });
  revalidatePath("/noticias");
  revalidatePath("/");
}
