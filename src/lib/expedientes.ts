import { EstadoExpediente } from "@/generated/prisma/client";

/**
 * Máquina de estados del expediente legislativo.
 * Flujo según Ley Orgánica de Municipalidades de Santa Fe (N° 2756).
 */
export const TRANSICIONES: Record<EstadoExpediente, EstadoExpediente[]> = {
  INGRESADO: [EstadoExpediente.EN_COMISION, EstadoExpediente.EN_ORDEN_DEL_DIA, EstadoExpediente.ARCHIVADO],
  EN_COMISION: [EstadoExpediente.CON_DICTAMEN, EstadoExpediente.ARCHIVADO],
  CON_DICTAMEN: [EstadoExpediente.EN_ORDEN_DEL_DIA, EstadoExpediente.EN_COMISION, EstadoExpediente.ARCHIVADO],
  EN_ORDEN_DEL_DIA: [EstadoExpediente.APROBADO, EstadoExpediente.RECHAZADO, EstadoExpediente.EN_COMISION],
  APROBADO: [EstadoExpediente.COMUNICADO_DEM, EstadoExpediente.PUBLICADO],
  RECHAZADO: [EstadoExpediente.ARCHIVADO],
  COMUNICADO_DEM: [EstadoExpediente.PROMULGADO, EstadoExpediente.VETADO],
  PROMULGADO: [EstadoExpediente.PUBLICADO],
  VETADO: [EstadoExpediente.EN_ORDEN_DEL_DIA, EstadoExpediente.ARCHIVADO],
  PUBLICADO: [EstadoExpediente.ARCHIVADO],
  ARCHIVADO: [],
};

export function puedeTransicionar(desde: EstadoExpediente, hasta: EstadoExpediente): boolean {
  return TRANSICIONES[desde]?.includes(hasta) ?? false;
}

/** Plazo de veto del DEM: 10 días hábiles desde la comunicación (art. 39, Ley 2756). */
export const DIAS_HABILES_VETO = 10;

/**
 * Suma días hábiles (lunes a viernes) a una fecha.
 * Nota: no contempla feriados; el calendario oficial puede cargarse a futuro.
 */
export function sumarDiasHabiles(desde: Date, dias: number): Date {
  const fecha = new Date(desde);
  let restantes = dias;
  while (restantes > 0) {
    fecha.setDate(fecha.getDate() + 1);
    const dow = fecha.getDay();
    if (dow !== 0 && dow !== 6) restantes--;
  }
  return fecha;
}

export function vencimientoVeto(fechaComunicacion: Date): Date {
  return sumarDiasHabiles(fechaComunicacion, DIAS_HABILES_VETO);
}

export function plazoVetoVencido(fechaComunicacion: Date, ahora = new Date()): boolean {
  return ahora > vencimientoVeto(fechaComunicacion);
}
