import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function guardarImagen(archivo: File): Promise<string> {
  if (!archivo || archivo.size === 0) throw new Error("Imagen requerida");
  if (archivo.size > MAX_IMAGE_BYTES) throw new Error("La imagen supera el máximo de 2 MB");
  if (!ALLOWED_MIMES.has(archivo.type)) throw new Error("Solo se admiten JPEG, PNG o WebP");

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const hashSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  const img = await prisma.imagen.create({
    data: {
      nombre: archivo.name,
      mime: archivo.type,
      datos: buffer,
      hashSha256,
      tamanio: archivo.size,
    },
  });
  return img.id;
}

/** Reemplaza imagen existente si se sube un archivo nuevo; devuelve el id vigente. */
export async function reemplazarImagen(
  imagenId: string | null | undefined,
  archivo: File | null,
): Promise<string | null | undefined> {
  if (!archivo || archivo.size === 0) return imagenId ?? null;
  const nuevoId = await guardarImagen(archivo);
  if (imagenId) {
    await prisma.imagen.delete({ where: { id: imagenId } }).catch(() => {});
  }
  return nuevoId;
}

export function imagenUrl(id: string | null | undefined): string | null {
  return id ? `/api/imagenes/${id}` : null;
}
