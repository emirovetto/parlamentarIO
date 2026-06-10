"use server";

import { z } from "zod";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_EXPEDIENTES } from "@/lib/rbac";
import { puedeTransicionar } from "@/lib/expedientes";
import { EstadoExpediente, TipoNormativa, OrigenExpediente, TipoDictamen } from "@/generated/prisma/client";

// ── Mesa de Entradas ──

const expedienteSchema = z.object({
  tipo: z.nativeEnum(TipoNormativa),
  origen: z.nativeEnum(OrigenExpediente),
  caratula: z.string().min(5).max(300),
  descripcion: z.string().max(2000).optional().or(z.literal("")),
  textoCompleto: z.string().min(10),
  bloqueId: z.string().optional().or(z.literal("")),
  presentadoPor: z.string().max(200).optional().or(z.literal("")),
  esSensible: z.boolean(),
  autores: z.array(z.string()),
});

export async function crearExpediente(formData: FormData) {
  const user = await requireRole(GESTION_EXPEDIENTES);
  const data = expedienteSchema.parse({
    tipo: formData.get("tipo"),
    origen: formData.get("origen"),
    caratula: formData.get("caratula"),
    descripcion: formData.get("descripcion") ?? "",
    textoCompleto: formData.get("textoCompleto"),
    bloqueId: formData.get("bloqueId") ?? "",
    presentadoPor: formData.get("presentadoPor") ?? "",
    esSensible: formData.get("esSensible") === "on",
    autores: formData.getAll("autores").map(String),
  });

  const anio = new Date().getFullYear();

  // Numeración automática por año y tipo, dentro de una transacción
  const expediente = await prisma.$transaction(async (tx) => {
    const ultimo = await tx.expediente.findFirst({
      where: { anio, tipo: data.tipo },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    const exp = await tx.expediente.create({
      data: {
        numero: (ultimo?.numero ?? 0) + 1,
        anio,
        tipo: data.tipo,
        origen: data.origen,
        caratula: data.caratula,
        descripcion: data.descripcion || null,
        textoCompleto: data.textoCompleto,
        bloqueId: data.bloqueId || null,
        presentadoPor: data.presentadoPor || null,
        esSensible: data.esSensible,
        autores: { create: data.autores.map((concejalId) => ({ concejalId })) },
      },
    });
    await tx.movimientoExpediente.create({
      data: {
        expedienteId: exp.id,
        estadoHasta: EstadoExpediente.INGRESADO,
        observacion: "Ingreso por Mesa de Entradas",
        usuario: user.name,
      },
    });
    return exp;
  });

  await audit({ userId: user.id, accion: "CREAR", entidad: "Expediente", entidadId: expediente.id, datos: { numero: expediente.numero, anio, tipo: data.tipo } });
  redirect(`/admin/expedientes/${expediente.id}`);
}

// ── Transiciones de estado ──

async function transicionar(
  expedienteId: string,
  hasta: EstadoExpediente,
  userName: string,
  userId: string,
  observacion?: string,
  extra?: Record<string, unknown>,
) {
  const exp = await prisma.expediente.findUniqueOrThrow({ where: { id: expedienteId } });
  if (!puedeTransicionar(exp.estado, hasta)) {
    throw new Error(`Transición inválida: ${exp.estado} → ${hasta}`);
  }
  await prisma.$transaction([
    prisma.expediente.update({ where: { id: expedienteId }, data: { estado: hasta, ...extra } }),
    prisma.movimientoExpediente.create({
      data: { expedienteId, estadoDesde: exp.estado, estadoHasta: hasta, observacion, usuario: userName },
    }),
  ]);
  await audit({ userId, accion: `ESTADO_${hasta}`, entidad: "Expediente", entidadId: expedienteId, datos: { desde: exp.estado, observacion } });
}

export async function cambiarEstado(expedienteId: string, formData: FormData) {
  const user = await requireRole(GESTION_EXPEDIENTES);
  const hasta = z.nativeEnum(EstadoExpediente).parse(formData.get("estado"));
  const observacion = String(formData.get("observacion") ?? "") || undefined;

  const extra: Record<string, unknown> = {};
  if (hasta === EstadoExpediente.COMUNICADO_DEM) extra.fechaComunicacionDem = new Date();
  if (hasta === EstadoExpediente.PROMULGADO) extra.fechaPromulgacion = new Date();

  await transicionar(expedienteId, hasta, user.name, user.id, observacion, extra);
  revalidatePath(`/admin/expedientes/${expedienteId}`);
  revalidatePath("/admin/expedientes");
}

export async function asignarNumeroNorma(expedienteId: string, formData: FormData) {
  const user = await requireRole(GESTION_EXPEDIENTES);
  const numeroNorma = z.string().min(3).max(100).parse(formData.get("numeroNorma"));
  await prisma.expediente.update({ where: { id: expedienteId }, data: { numeroNorma } });
  await audit({ userId: user.id, accion: "ASIGNAR_NUMERO_NORMA", entidad: "Expediente", entidadId: expedienteId, datos: { numeroNorma } });
  revalidatePath(`/admin/expedientes/${expedienteId}`);
}

// ── Giros a comisión ──

export async function girarAComision(expedienteId: string, formData: FormData) {
  const user = await requireRole(GESTION_EXPEDIENTES);
  const comisionId = z.string().min(1).parse(formData.get("comisionId"));

  const exp = await prisma.expediente.findUniqueOrThrow({ where: { id: expedienteId }, include: { giros: true } });
  await prisma.giroComision.create({
    data: { expedienteId, comisionId, orden: exp.giros.length + 1 },
  });
  if (exp.estado === EstadoExpediente.INGRESADO || exp.estado === EstadoExpediente.CON_DICTAMEN) {
    await transicionar(expedienteId, EstadoExpediente.EN_COMISION, user.name, user.id, "Giro a comisión");
  }
  await audit({ userId: user.id, accion: "GIRAR_COMISION", entidad: "Expediente", entidadId: expedienteId, datos: { comisionId } });
  revalidatePath(`/admin/expedientes/${expedienteId}`);
}

// ── Dictámenes ──

export async function emitirDictamen(expedienteId: string, formData: FormData) {
  const user = await requireRole(GESTION_EXPEDIENTES);
  const data = z
    .object({ comisionId: z.string().min(1), tipo: z.nativeEnum(TipoDictamen), texto: z.string().min(10).max(50000) })
    .parse({ comisionId: formData.get("comisionId"), tipo: formData.get("tipo"), texto: formData.get("texto") });

  const dictamen = await prisma.dictamen.create({ data: { expedienteId, ...data } });

  const exp = await prisma.expediente.findUniqueOrThrow({ where: { id: expedienteId } });
  if (exp.estado === EstadoExpediente.EN_COMISION) {
    await transicionar(expedienteId, EstadoExpediente.CON_DICTAMEN, user.name, user.id, `Dictamen ${data.tipo.toLowerCase()} de comisión`);
  }
  await audit({ userId: user.id, accion: "EMITIR_DICTAMEN", entidad: "Dictamen", entidadId: dictamen.id, datos: { expedienteId, tipo: data.tipo } });
  revalidatePath(`/admin/expedientes/${expedienteId}`);
}

/**
 * Firma electrónica interna del dictamen: registra hash SHA-256 del texto,
 * firmante y timestamp. Punto de extensión para integrar PKI (Ley 25.506).
 */
export async function firmarDictamen(dictamenId: string, expedienteId: string) {
  const user = await requireRole(GESTION_EXPEDIENTES);
  const session = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { concejal: true } });
  if (!session.concejal) throw new Error("Solo los concejales pueden firmar dictámenes");

  const dictamen = await prisma.dictamen.findUniqueOrThrow({ where: { id: dictamenId } });
  const hashTexto = crypto.createHash("sha256").update(dictamen.texto).digest("hex");

  await prisma.firmaDictamen.upsert({
    where: { dictamenId_concejalId: { dictamenId, concejalId: session.concejal.id } },
    update: {},
    create: { dictamenId, concejalId: session.concejal.id, hashTexto },
  });
  await audit({ userId: user.id, accion: "FIRMAR_DICTAMEN", entidad: "Dictamen", entidadId: dictamenId, datos: { hashTexto } });
  revalidatePath(`/admin/expedientes/${expedienteId}`);
}

// ── Documentos adjuntos ──

const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4 MB: límite prudente para guardar en Postgres free

export async function subirDocumento(expedienteId: string, formData: FormData) {
  const user = await requireRole(GESTION_EXPEDIENTES);
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
      expedienteId,
      subidoPorId: user.id,
      publico: formData.get("publico") === "on",
    },
  });
  await audit({ userId: user.id, accion: "SUBIR_DOCUMENTO", entidad: "Documento", entidadId: doc.id, datos: { expedienteId, hashSha256, nombre: archivo.name } });
  revalidatePath(`/admin/expedientes/${expedienteId}`);
}

// ── Anonimización (Ley 25.326) ──

export async function guardarVersionPublica(expedienteId: string, formData: FormData) {
  const user = await requireRole(GESTION_EXPEDIENTES);
  const versionPublica = z.string().min(10).parse(formData.get("versionPublica"));
  await prisma.expediente.update({ where: { id: expedienteId }, data: { versionPublica, esSensible: true } });
  await audit({ userId: user.id, accion: "GUARDAR_VERSION_PUBLICA", entidad: "Expediente", entidadId: expedienteId });
  revalidatePath(`/admin/expedientes/${expedienteId}`);
}
