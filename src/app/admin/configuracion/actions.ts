"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { GESTION_PORTAL } from "@/lib/rbac";
import { reemplazarImagen } from "@/lib/imagenes";
import { CONFIG_ID } from "@/lib/configuracion";

const configSchema = z.object({
  nombreMunicipio: z.string().min(2).max(120),
  nombreConcejo: z.string().min(2).max(120),
  provincia: z.string().min(2).max(80),
  slogan: z.string().max(300).optional().or(z.literal("")),
  colorPrimario: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  colorSecundario: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  direccion: z.string().max(300).optional().or(z.literal("")),
  telefono: z.string().max(60).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  urlYoutube: z.string().url().optional().or(z.literal("")),
  urlFacebook: z.string().url().optional().or(z.literal("")),
  urlInstagram: z.string().url().optional().or(z.literal("")),
  urlTwitter: z.string().url().optional().or(z.literal("")),
  textoHero: z.string().max(2000).optional().or(z.literal("")),
  textoFooter: z.string().max(2000).optional().or(z.literal("")),
  mostrarSesionEnVivo: z.coerce.boolean().optional(),
});

export async function guardarConfiguracion(formData: FormData) {
  const user = await requireRole(GESTION_PORTAL);
  const data = configSchema.parse({
    nombreMunicipio: formData.get("nombreMunicipio"),
    nombreConcejo: formData.get("nombreConcejo"),
    provincia: formData.get("provincia"),
    slogan: formData.get("slogan") ?? "",
    colorPrimario: formData.get("colorPrimario"),
    colorSecundario: formData.get("colorSecundario"),
    direccion: formData.get("direccion") ?? "",
    telefono: formData.get("telefono") ?? "",
    email: formData.get("email") ?? "",
    urlYoutube: formData.get("urlYoutube") ?? "",
    urlFacebook: formData.get("urlFacebook") ?? "",
    urlInstagram: formData.get("urlInstagram") ?? "",
    urlTwitter: formData.get("urlTwitter") ?? "",
    textoHero: formData.get("textoHero") ?? "",
    textoFooter: formData.get("textoFooter") ?? "",
    mostrarSesionEnVivo: formData.get("mostrarSesionEnVivo") === "on",
  });

  const actual = await prisma.configuracionSitio.findUnique({ where: { id: CONFIG_ID } });
  const logoId = await reemplazarImagen(actual?.logoId, formData.get("logo") as File | null);

  await prisma.configuracionSitio.upsert({
    where: { id: CONFIG_ID },
    update: {
      ...data,
      slogan: data.slogan || null,
      direccion: data.direccion || null,
      telefono: data.telefono || null,
      email: data.email || null,
      urlYoutube: data.urlYoutube || null,
      urlFacebook: data.urlFacebook || null,
      urlInstagram: data.urlInstagram || null,
      urlTwitter: data.urlTwitter || null,
      textoHero: data.textoHero || null,
      textoFooter: data.textoFooter || null,
      logoId: logoId ?? null,
      mostrarSesionEnVivo: data.mostrarSesionEnVivo ?? true,
    },
    create: {
      id: CONFIG_ID,
      ...data,
      logoId: logoId ?? null,
    },
  });

  await audit({ userId: user.id, accion: "GUARDAR_CONFIG_SITIO", entidad: "ConfiguracionSitio", entidadId: CONFIG_ID });
  revalidatePath("/");
  revalidatePath("/admin/configuracion");
}
