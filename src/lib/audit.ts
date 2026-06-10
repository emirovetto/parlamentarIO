import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Registro de auditoría append-only.
 * Toda mutación relevante del sistema debe pasar por acá:
 * quién, qué acción, sobre qué entidad y con qué datos.
 */
export async function audit(params: {
  userId?: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  datos?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      accion: params.accion,
      entidad: params.entidad,
      entidadId: params.entidadId ?? null,
      datos: params.datos,
    },
  });
}
