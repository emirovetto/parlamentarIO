import { prisma } from "@/lib/prisma";
import { getConfiguracionSitio } from "@/lib/configuracion";
import { TIPO_SESION, TIPO_VOTACION, MAYORIA } from "@/lib/format";
import type { TipoPlantilla } from "@/generated/prisma/client";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function reemplazarVars(plantilla: string, vars: Record<string, string>) {
  let out = plantilla;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

export async function obtenerPlantillaDefault(tipo: TipoPlantilla) {
  return prisma.plantillaDocumento.findFirst({
    where: { tipo, activa: true, esDefault: true },
  });
}

export async function generarBorradorActaSesion(sesionId: string): Promise<string> {
  const [sesion, config, plantilla] = await Promise.all([
    prisma.sesion.findUniqueOrThrow({
      where: { id: sesionId },
      include: {
        puntos: { orderBy: { orden: "asc" }, include: { expediente: true } },
        asistencias: { include: { concejal: true } },
        votaciones: { include: { votos: { include: { concejal: true } } } },
      },
    }),
    getConfiguracionSitio(),
    obtenerPlantillaDefault("ACTA_SESION"),
  ]);

  const fecha = new Date(sesion.fecha);
  const presentes = sesion.asistencias.filter((a) => a.presente);
  const ausentes = sesion.asistencias.filter((a) => !a.presente);

  const autoridades = await prisma.autoridad.findMany({
    where: { hasta: null },
    include: { concejal: true },
  });
  const presidente = autoridades.find((a) => a.cargo === "PRESIDENTE");
  const secParl = autoridades.find((a) => a.cargo === "SECRETARIO_PARLAMENTARIO");

  const ordenDelDia = sesion.puntos
    .map((p) => `${p.orden}. ${p.titulo}${p.tratado ? " (TRATADO)" : ""}`)
    .join("\n");

  const votaciones = sesion.votaciones
    .map((v) => {
      const afirm = v.votos.filter((x) => x.valor === "AFIRMATIVO").length;
      const neg = v.votos.filter((x) => x.valor === "NEGATIVO").length;
      const abst = v.votos.filter((x) => x.valor === "ABSTENCION").length;
      const resultado = v.aprobada === true ? "APROBADO" : v.aprobada === false ? "RECHAZADO" : "SIN RESULTADO";
      return `${v.titulo} — ${TIPO_VOTACION[v.tipo]} (${MAYORIA[v.mayoria]}): ${resultado}. Votos: ${afirm} afirmativos, ${neg} negativos, ${abst} abstenciones.`;
    })
    .join("\n\n");

  const vars: Record<string, string> = {
    municipio: config.nombreMunicipio,
    concejo: config.nombreConcejo,
    provincia: config.provincia,
    ciudad: config.nombreMunicipio,
    tipoSesion: TIPO_SESION[sesion.tipo],
    numero: String(sesion.numero),
    anio: String(sesion.anio),
    dia: String(fecha.getDate()),
    mes: MESES[fecha.getMonth()] ?? "",
    anioCalendario: String(fecha.getFullYear()),
    hora: fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    horaCierre: sesion.horaFinReal
      ? new Date(sesion.horaFinReal).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
      : "—",
    presidente: presidente ? `${presidente.concejal.nombre} ${presidente.concejal.apellido}` : "—",
    secretarioParlamentario: secParl ? `${secParl.concejal.nombre} ${secParl.concejal.apellido}` : "Secretario Parlamentario",
    listaAsistentes: presentes.length
      ? presentes.map((a) => `• ${a.concejal.apellido}, ${a.concejal.nombre}`).join("\n")
      : "—",
    listaAusentes: ausentes.length
      ? ausentes.map((a) => `• ${a.concejal.apellido}, ${a.concejal.nombre}`).join("\n")
      : "Ninguno",
    quorum: presentes.length >= 5 ? "LEGAL" : "NO VERIFICADO",
    ordenDelDia: ordenDelDia || "Sin puntos registrados.",
    desarrollo: sesion.notasPostSesion ?? "Desarrollo de la sesión conforme al Orden del Día.",
    votaciones: votaciones || "Sin votaciones registradas.",
  };

  const base = plantilla?.contenido ?? `ACTA DE SESIÓN {{tipoSesion}} N° {{numero}}/{{anio}}

En la ciudad de {{ciudad}}, provincia de {{provincia}}, a los {{dia}} días del mes de {{mes}} de {{anioCalendario}}, siendo las {{hora}} horas, en el recinto del {{concejo}} de {{municipio}}, bajo la presidencia de {{presidente}}, se reúne el cuerpo legislativo.

ASISTENCIA:
{{listaAsistentes}}

AUSENTES:
{{listaAusentes}}

QUÓRUM: {{quorum}}

ORDEN DEL DÍA:
{{ordenDelDia}}

VOTACIONES:
{{votaciones}}

{{desarrollo}}

Sin otro particular, se da por finalizada la sesión.

{{secretarioParlamentario}}
Secretario Parlamentario`;

  return reemplazarVars(base, vars);
}
