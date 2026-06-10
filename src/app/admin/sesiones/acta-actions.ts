"use server";

import { requireRole } from "@/lib/session";
import { GESTION_SESIONES } from "@/lib/rbac";
import { generarBorradorActaSesion } from "@/lib/actas";

export async function generarBorradorActaAction(sesionId: string): Promise<string> {
  await requireRole(GESTION_SESIONES);
  return generarBorradorActaSesion(sesionId);
}
