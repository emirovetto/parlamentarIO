import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { imagenUrl } from "@/lib/imagenes";

export const CONFIG_ID = "sitio";

const DEFAULTS = {
  id: CONFIG_ID,
  nombreMunicipio: "Municipio",
  nombreConcejo: "Concejo Deliberante",
  provincia: "Santa Fe",
  slogan: null as string | null,
  colorPrimario: "#1e3a5f",
  colorSecundario: "#0ea5e9",
  logoId: null as string | null,
  direccion: null as string | null,
  telefono: null as string | null,
  email: null as string | null,
  urlYoutube: null as string | null,
  urlFacebook: null as string | null,
  urlInstagram: null as string | null,
  urlTwitter: null as string | null,
  textoHero: null as string | null,
  textoFooter: null as string | null,
  mostrarSesionEnVivo: true,
  updatedAt: new Date(),
};

export const getConfiguracionSitio = cache(async () => {
  const config = await prisma.configuracionSitio.findUnique({
    where: { id: CONFIG_ID },
    include: { logo: true },
  });

  const merged = config ?? DEFAULTS;
  return {
    ...merged,
    logoSrc: imagenUrl(merged.logoId),
  };
});
