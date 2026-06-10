"use server";

import { z } from "zod";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_INSTITUCIONAL } from "@/lib/rbac";
import { CategoriaTransparencia } from "@/generated/prisma/client";

const MAX_PDF_BYTES = 4 * 1024 * 1024;

export async function publicarDocumentoTransparencia(formData: FormData) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  const meta = z
    .object({ titulo: z.string().min(3).max(200), categoria: z.nativeEnum(CategoriaTransparencia) })
    .parse({ titulo: formData.get("titulo"), categoria: formData.get("categoria") });

  const archivo = formData.get("archivo") as File | null;
  if (!archivo || archivo.size === 0) throw new Error("Archivo requerido");
  if (archivo.size > MAX_PDF_BYTES) throw new Error("El archivo supera el máximo de 4 MB");
  if (archivo.type !== "application/pdf") throw new Error("Solo se admiten PDF");

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const hashSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  const doc = await prisma.documento.create({
    data: {
      nombre: archivo.name,
      mime: archivo.type,
      datos: buffer,
      hashSha256,
      tamanio: archivo.size,
      titulo: meta.titulo,
      categoria: meta.categoria,
      publico: true,
      subidoPorId: user.id,
    },
  });
  await audit({ userId: user.id, accion: "PUBLICAR_TRANSPARENCIA", entidad: "Documento", entidadId: doc.id, datos: { ...meta, hashSha256 } });
  revalidatePath("/admin/transparencia");
  revalidatePath("/transparencia");
}

export async function despublicarDocumento(id: string) {
  const user = await requireRole(GESTION_INSTITUCIONAL);
  await prisma.documento.update({ where: { id }, data: { publico: false } });
  await audit({ userId: user.id, accion: "DESPUBLICAR", entidad: "Documento", entidadId: id });
  revalidatePath("/admin/transparencia");
  revalidatePath("/transparencia");
}
