import type { EstadoExpediente, TipoNormativa, OrigenExpediente, TipoSesion, EstadoSesion, TipoVotacion, MayoriaRequerida, TipoDictamen, CargoAutoridad, RolComision, EstadoSolicitud, EstadoAudiencia, CategoriaTransparencia, ValorVoto, TipoTarea, PrioridadTarea, EstadoTarea, CategoriaNoticia, TipoPlantilla } from "@/generated/prisma/client";

export function fecha(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fechaHora(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function nroExpediente(e: { numero: number; anio: number }): string {
  return `${String(e.numero).padStart(4, "0")}/${e.anio}`;
}

export const TIPO_NORMATIVA: Record<TipoNormativa, string> = {
  ORDENANZA: "Ordenanza",
  RESOLUCION: "Resolución",
  DECRETO: "Decreto",
  MINUTA_COMUNICACION: "Minuta de Comunicación",
  DECLARACION: "Declaración",
};

export const ESTADO_EXPEDIENTE: Record<EstadoExpediente, string> = {
  INGRESADO: "Ingresado",
  EN_COMISION: "En Comisión",
  CON_DICTAMEN: "Con Dictamen",
  EN_ORDEN_DEL_DIA: "En Orden del Día",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  COMUNICADO_DEM: "Comunicado al DEM",
  PROMULGADO: "Promulgado",
  VETADO: "Vetado",
  PUBLICADO: "Publicado",
  ARCHIVADO: "Archivado",
};

export const ESTADO_COLOR: Record<EstadoExpediente, string> = {
  INGRESADO: "bg-slate-100 text-slate-700",
  EN_COMISION: "bg-amber-100 text-amber-800",
  CON_DICTAMEN: "bg-violet-100 text-violet-800",
  EN_ORDEN_DEL_DIA: "bg-blue-100 text-blue-800",
  APROBADO: "bg-green-100 text-green-800",
  RECHAZADO: "bg-red-100 text-red-800",
  COMUNICADO_DEM: "bg-cyan-100 text-cyan-800",
  PROMULGADO: "bg-emerald-100 text-emerald-800",
  VETADO: "bg-rose-100 text-rose-800",
  PUBLICADO: "bg-teal-100 text-teal-800",
  ARCHIVADO: "bg-gray-200 text-gray-600",
};

export const ORIGEN_EXPEDIENTE: Record<OrigenExpediente, string> = {
  BLOQUE: "Bloque político",
  DEM: "Departamento Ejecutivo Municipal",
  PARTICULAR: "Particular / Vecino",
};

export const TIPO_SESION: Record<TipoSesion, string> = {
  ORDINARIA: "Ordinaria",
  EXTRAORDINARIA: "Extraordinaria",
  ESPECIAL: "Especial",
  PREPARATORIA: "Preparatoria",
};

export const ESTADO_SESION: Record<EstadoSesion, string> = {
  PROGRAMADA: "Programada",
  EN_CURSO: "En curso",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};

export const TIPO_VOTACION: Record<TipoVotacion, string> = {
  NOMINAL: "Nominal",
  POR_SIGNOS: "Por signos",
  UNANIMIDAD: "Unanimidad",
};

export const MAYORIA: Record<MayoriaRequerida, string> = {
  SIMPLE: "Mayoría simple",
  ABSOLUTA: "Mayoría absoluta",
  DOS_TERCIOS: "Dos tercios",
};

export const VALOR_VOTO: Record<ValorVoto, string> = {
  AFIRMATIVO: "Afirmativo",
  NEGATIVO: "Negativo",
  ABSTENCION: "Abstención",
};

export const TIPO_DICTAMEN: Record<TipoDictamen, string> = {
  FAVORABLE: "Favorable",
  DESFAVORABLE: "Desfavorable",
  EN_MINORIA: "En minoría",
  DIVIDIDO: "Dividido",
};

export const CARGO_AUTORIDAD: Record<CargoAutoridad, string> = {
  PRESIDENTE: "Presidente/a",
  VICEPRESIDENTE_1: "Vicepresidente/a 1°",
  VICEPRESIDENTE_2: "Vicepresidente/a 2°",
  SECRETARIO_PARLAMENTARIO: "Secretario/a Parlamentario/a",
  SECRETARIO_ADMINISTRATIVO: "Secretario/a Administrativo/a",
};

export const ROL_COMISION: Record<RolComision, string> = {
  PRESIDENTE: "Presidente/a",
  VICEPRESIDENTE: "Vicepresidente/a",
  VOCAL: "Vocal",
};

export const ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  REALIZADA: "Realizada",
};

export const ESTADO_AUDIENCIA: Record<EstadoAudiencia, string> = {
  CONVOCADA: "Convocada",
  INSCRIPCION_ABIERTA: "Inscripción abierta",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
};

export const CATEGORIA_TRANSPARENCIA: Record<CategoriaTransparencia, string> = {
  BOLETIN_OFICIAL: "Boletín Oficial Municipal",
  DDJJ: "Declaraciones Juradas",
  ESCALA_SALARIAL: "Escalas Salariales",
  EJECUCION_PRESUPUESTARIA: "Ejecución Presupuestaria",
  OTRO: "Otros documentos",
};

export const TIPO_TAREA: Record<TipoTarea, string> = {
  SESION: "Sesión",
  COMISION: "Comisión",
  DICTAMEN: "Dictamen",
  VOTACION: "Votación",
  EXPEDIENTE: "Expediente",
  BANCA_CIUDADANA: "Banca ciudadana",
  AUDIENCIA: "Audiencia",
  GENERAL: "General",
};

export const PRIORIDAD_TAREA: Record<PrioridadTarea, string> = {
  URGENTE: "Urgente",
  ALTA: "Alta",
  NORMAL: "Normal",
  BAJA: "Baja",
};

export const PRIORIDAD_COLOR: Record<PrioridadTarea, string> = {
  URGENTE: "bg-red-100 text-red-800",
  ALTA: "bg-amber-100 text-amber-800",
  NORMAL: "bg-slate-100 text-slate-700",
  BAJA: "bg-gray-100 text-gray-600",
};

export const ESTADO_TAREA: Record<EstadoTarea, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

export const CATEGORIA_NOTICIA: Record<CategoriaNoticia, string> = {
  GENERAL: "General",
  LEGISLATIVA: "Legislativa",
  INSTITUCIONAL: "Institucional",
  CULTURA: "Cultura",
  COMUNIDAD: "Comunidad",
};

export const TIPO_PLANTILLA: Record<TipoPlantilla, string> = {
  ACTA_SESION: "Acta de sesión",
  ACTA_COMISION: "Acta de comisión",
  DICTAMEN: "Dictamen",
  ORDEN_DEL_DIA: "Orden del Día",
  MEMBRETE: "Membrete institucional",
  CARTA: "Carta / oficio",
};
