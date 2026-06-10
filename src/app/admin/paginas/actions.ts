"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_PORTAL } from "@/lib/rbac";
import { slugify } from "@/lib/slug";

const paginaSchema = z.object({
  titulo: z.string().min(3).max(200),
  slug: z.string().min(2).max(120).optional().or(z.literal("")),
  contenido: z.string().min(10),
  publicada: z.coerce.boolean().optional(),
  orden: z.coerce.number().int().min(0).default(0),
});

export async function guardarPagina(id: string | null, formData: FormData) {
  const user = await requireRole(GESTION_PORTAL);
  const data = paginaSchema.parse({
    titulo: formData.get("titulo"),
    slug: formData.get("slug") ?? "",
    contenido: formData.get("contenido"),
    publicada: formData.get("publicada") === "on",
    orden: formData.get("orden") ?? 0,
  });
  const slug = data.slug || slugify(data.titulo);

  if (id) {
    await prisma.paginaInstitucional.update({
      where: { id },
      data: { ...data, slug },
    });
    await audit({ userId: user.id, accion: "ACTUALIZAR_PAGINA", entidad: "PaginaInstitucional", entidadId: id });
  } else {
    const p = await prisma.paginaInstitucional.create({ data: { ...data, slug } });
    await audit({ userId: user.id, accion: "CREAR_PAGINA", entidad: "PaginaInstitucional", entidadId: p.id });
  }

  revalidatePath("/institucional");
  revalidatePath(`/institucional/${slug}`);
  revalidatePath("/admin/paginas");
}
