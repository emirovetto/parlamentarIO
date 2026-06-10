"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_IMPORTACIONES } from "@/lib/rbac";
import { parseCsv, rowsToObjects } from "@/lib/csv";
import { TipoNormativa, EstadoExpediente, OrigenExpediente } from "@/generated/prisma/client";

export type ImportResult = { ok: number; skip: number; errors: string[] };

// ── Bloques / partidos históricos ──
// CSV: nombre,partido,color
type BloqueRow = { nombre: string; partido: string; color: string };

export async function importarBloques(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const user = await requireRole(GESTION_IMPORTACIONES);
  const csv = String(formData.get("csv") ?? "");
  const { data, errors: parseErrors } = rowsToObjects<BloqueRow>(parseCsv(csv), ["nombre", "partido"]);
  if (parseErrors.length) return { ok: 0, skip: 0, errors: parseErrors };

  let ok = 0;
  let skip = 0;
  const errors: string[] = [];

  for (const [i, row] of data.entries()) {
    const line = i + 2;
    if (!row.nombre || !row.partido) {
      errors.push(`Fila ${line}: nombre y partido son obligatorios`);
      continue;
    }
    const color = row.color?.match(/^#[0-9a-fA-F]{6}$/) ? row.color : "#2563eb";
    try {
      await prisma.bloque.upsert({
        where: { nombre: row.nombre.trim() },
        update: { partido: row.partido.trim(), color },
        create: { nombre: row.nombre.trim(), partido: row.partido.trim(), color },
      });
      ok++;
    } catch {
      skip++;
      errors.push(`Fila ${line}: no se pudo importar "${row.nombre}"`);
    }
  }

  await audit({ userId: user.id, accion: "IMPORTAR_BLOQUES", entidad: "Bloque", datos: { ok, skip } });
  revalidatePath("/admin/bloques");
  revalidatePath("/admin/importaciones");
  return { ok, skip, errors };
}

// ── Concejales históricos ──
// CSV: nombre,apellido,dni,partido,bloque,mandato_inicio,mandato_fin,biografia,email
type ConcejalRow = {
  nombre: string;
  apellido: string;
  dni: string;
  partido: string;
  bloque: string;
  mandato_inicio: string;
  mandato_fin: string;
  biografia: string;
  email: string;
};

export async function importarConcejales(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const user = await requireRole(GESTION_IMPORTACIONES);
  const csv = String(formData.get("csv") ?? "");
  const { data, errors: parseErrors } = rowsToObjects<ConcejalRow>(parseCsv(csv), [
    "nombre", "apellido", "partido", "bloque", "mandato_inicio", "mandato_fin",
  ]);
  if (parseErrors.length) return { ok: 0, skip: 0, errors: parseErrors };

  let ok = 0;
  let skip = 0;
  const errors: string[] = [];

  for (const [i, row] of data.entries()) {
    const line = i + 2;
    const bloque = await prisma.bloque.findFirst({ where: { nombre: { equals: row.bloque.trim(), mode: "insensitive" } } });
    if (!bloque) {
      errors.push(`Fila ${line}: bloque "${row.bloque}" no encontrado (importá bloques primero)`);
      continue;
    }
    const mandatoInicio = new Date(row.mandato_inicio);
    const mandatoFin = new Date(row.mandato_fin);
    if (isNaN(mandatoInicio.getTime()) || isNaN(mandatoFin.getTime())) {
      errors.push(`Fila ${line}: fechas de mandato inválidas (usar YYYY-MM-DD)`);
      continue;
    }
    try {
      const dni = row.dni?.trim() || undefined;
      const existing = dni
        ? await prisma.concejal.findUnique({ where: { dni } })
        : await prisma.concejal.findFirst({ where: { apellido: row.apellido.trim(), nombre: row.nombre.trim(), bloqueId: bloque.id } });

      if (existing) {
        await prisma.concejal.update({
          where: { id: existing.id },
          data: {
            partido: row.partido.trim(),
            bloqueId: bloque.id,
            mandatoInicio,
            mandatoFin,
            biografia: row.biografia?.trim() || null,
            activo: mandatoFin >= new Date(),
          },
        });
      } else {
        await prisma.concejal.create({
          data: {
            nombre: row.nombre.trim(),
            apellido: row.apellido.trim(),
            dni: dni ?? `imp-${Date.now()}-${i}`,
            partido: row.partido.trim(),
            bloqueId: bloque.id,
            mandatoInicio,
            mandatoFin,
            biografia: row.biografia?.trim() || null,
            activo: mandatoFin >= new Date(),
          },
        });
      }
      ok++;
    } catch (e) {
      skip++;
      errors.push(`Fila ${line}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  await audit({ userId: user.id, accion: "IMPORTAR_CONCEJALES", entidad: "Concejal", datos: { ok, skip } });
  revalidatePath("/admin/concejales");
  revalidatePath("/admin/importaciones");
  return { ok, skip, errors };
}

// ── Ordenanzas / normativa histórica ──
// CSV: numero,anio,tipo,caratula,texto,estado,numero_norma,fecha_promulgacion
type OrdenanzaRow = {
  numero: string;
  anio: string;
  tipo: string;
  caratula: string;
  texto: string;
  estado: string;
  numero_norma: string;
  fecha_promulgacion: string;
};

const TIPO_MAP: Record<string, TipoNormativa> = {
  ordenanza: TipoNormativa.ORDENANZA,
  resolucion: TipoNormativa.RESOLUCION,
  resolución: TipoNormativa.RESOLUCION,
  decreto: TipoNormativa.DECRETO,
  declaracion: TipoNormativa.DECLARACION,
  declaración: TipoNormativa.DECLARACION,
  minuta: TipoNormativa.MINUTA_COMUNICACION,
};

const ESTADO_MAP: Record<string, EstadoExpediente> = {
  publicado: EstadoExpediente.PUBLICADO,
  promulgado: EstadoExpediente.PROMULGADO,
  aprobado: EstadoExpediente.APROBADO,
  archivado: EstadoExpediente.ARCHIVADO,
  ingresado: EstadoExpediente.INGRESADO,
};

export async function importarOrdenanzas(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const user = await requireRole(GESTION_IMPORTACIONES);
  const csv = String(formData.get("csv") ?? "");
  const { data, errors: parseErrors } = rowsToObjects<OrdenanzaRow>(parseCsv(csv), [
    "numero", "anio", "tipo", "caratula", "texto",
  ]);
  if (parseErrors.length) return { ok: 0, skip: 0, errors: parseErrors };

  let ok = 0;
  let skip = 0;
  const errors: string[] = [];

  for (const [i, row] of data.entries()) {
    const line = i + 2;
    const numero = Number(row.numero);
    const anio = Number(row.anio);
    const tipo = TIPO_MAP[row.tipo?.trim().toLowerCase()];
    const estado = ESTADO_MAP[row.estado?.trim().toLowerCase()] ?? EstadoExpediente.PUBLICADO;

    if (!numero || !anio || !tipo) {
      errors.push(`Fila ${line}: numero, anio y tipo válidos son obligatorios`);
      continue;
    }
    if (!row.caratula?.trim() || !row.texto?.trim()) {
      errors.push(`Fila ${line}: caratula y texto son obligatorios`);
      continue;
    }

    const fechaProm = row.fecha_promulgacion ? new Date(row.fecha_promulgacion) : null;

    try {
      await prisma.expediente.upsert({
        where: { numero_anio_tipo: { numero, anio, tipo } },
        update: {
          caratula: row.caratula.trim(),
          textoCompleto: row.texto.trim(),
          estado,
          numeroNorma: row.numero_norma?.trim() || null,
          fechaPromulgacion: fechaProm && !isNaN(fechaProm.getTime()) ? fechaProm : null,
        },
        create: {
          numero,
          anio,
          tipo,
          caratula: row.caratula.trim(),
          textoCompleto: row.texto.trim(),
          descripcion: `Importado históricamente`,
          origen: OrigenExpediente.BLOQUE,
          estado,
          numeroNorma: row.numero_norma?.trim() || null,
          fechaPromulgacion: fechaProm && !isNaN(fechaProm.getTime()) ? fechaProm : null,
          fechaIngreso: fechaProm && !isNaN(fechaProm.getTime()) ? fechaProm : new Date(anio, 0, 1),
        },
      });
      ok++;
    } catch (e) {
      skip++;
      errors.push(`Fila ${line}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  await audit({ userId: user.id, accion: "IMPORTAR_ORDENANZAS", entidad: "Expediente", datos: { ok, skip } });
  revalidatePath("/admin/expedientes");
  revalidatePath("/digesto");
  revalidatePath("/admin/importaciones");
  return { ok, skip, errors };
}
