import { Role } from "@/generated/prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  PRESIDENTE: "Presidente del Concejo",
  SECRETARIO_PARLAMENTARIO: "Secretario Parlamentario",
  SECRETARIO_ADMINISTRATIVO: "Secretario Administrativo",
  CONCEJAL: "Concejal",
  SECRETARIO_BLOQUE: "Secretario de Bloque",
  EMPLEADO_COMISION: "Empleado de Comisión",
  CIUDADANO: "Ciudadano",
};

/** Roles con acceso al backoffice */
export const BACKOFFICE_ROLES: Role[] = [
  Role.ADMIN,
  Role.PRESIDENTE,
  Role.SECRETARIO_PARLAMENTARIO,
  Role.SECRETARIO_ADMINISTRATIVO,
  Role.CONCEJAL,
  Role.SECRETARIO_BLOQUE,
  Role.EMPLEADO_COMISION,
];

/** Pueden gestionar identidad institucional (concejales, bloques, comisiones) */
export const GESTION_INSTITUCIONAL: Role[] = [
  Role.ADMIN,
  Role.PRESIDENTE,
  Role.SECRETARIO_ADMINISTRATIVO,
];

/** Pueden operar mesa de entradas y expedientes */
export const GESTION_EXPEDIENTES: Role[] = [
  Role.ADMIN,
  Role.PRESIDENTE,
  Role.SECRETARIO_PARLAMENTARIO,
  Role.SECRETARIO_BLOQUE,
  Role.EMPLEADO_COMISION,
];

/** Pueden armar el orden del día y gestionar sesiones */
export const GESTION_SESIONES: Role[] = [
  Role.ADMIN,
  Role.PRESIDENTE,
  Role.SECRETARIO_PARLAMENTARIO,
];

/** Pueden emitir voto (solo concejales con usuario) */
export const PUEDE_VOTAR: Role[] = [Role.CONCEJAL, Role.PRESIDENTE];

/** Pueden gestionar participación ciudadana */
export const GESTION_PARTICIPACION: Role[] = [
  Role.ADMIN,
  Role.PRESIDENTE,
  Role.SECRETARIO_PARLAMENTARIO,
  Role.SECRETARIO_ADMINISTRATIVO,
];

/** Pueden crear y administrar usuarios del sistema */
export const GESTION_USUARIOS: Role[] = [
  Role.ADMIN,
  Role.SECRETARIO_ADMINISTRATIVO,
];

/** Pueden importar datos históricos (ordenanzas, concejales, bloques) */
export const GESTION_IMPORTACIONES: Role[] = [
  Role.ADMIN,
  Role.SECRETARIO_ADMINISTRATIVO,
  Role.SECRETARIO_PARLAMENTARIO,
];

/** Pueden gestionar portal público: noticias, configuración, plantillas, páginas */
export const GESTION_PORTAL: Role[] = [
  Role.ADMIN,
  Role.SECRETARIO_ADMINISTRATIVO,
  Role.SECRETARIO_PARLAMENTARIO,
  Role.PRESIDENTE,
];

export function hasRole(role: Role | undefined | null, allowed: Role[]): boolean {
  return !!role && allowed.includes(role);
}
