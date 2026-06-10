import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { plazoVetoVencido } from "@/lib/expedientes";
import { EstadoExpediente } from "@/generated/prisma/client";

/**
 * Promulgación automática (Ley 2756): si el DEM no veta dentro de los
 * 10 días hábiles de comunicada la norma, queda promulgada de pleno derecho.
 * Se ejecuta de forma diferida al cargar las vistas de expedientes
 * (en Render free no hay workers persistentes).
 */
export async function promulgarVencidos() {
  const comunicados = await prisma.expediente.findMany({
    where: { estado: EstadoExpediente.COMUNICADO_DEM, fechaComunicacionDem: { not: null } },
  });

  for (const exp of comunicados) {
    if (exp.fechaComunicacionDem && plazoVetoVencido(exp.fechaComunicacionDem)) {
      await prisma.$transaction([
        prisma.expediente.update({
          where: { id: exp.id },
          data: {
            estado: EstadoExpediente.PROMULGADO,
            fechaPromulgacion: new Date(),
            promulgacionAutomatica: true,
          },
        }),
        prisma.movimientoExpediente.create({
          data: {
            expedienteId: exp.id,
            estadoDesde: EstadoExpediente.COMUNICADO_DEM,
            estadoHasta: EstadoExpediente.PROMULGADO,
            observacion: "Promulgación automática por vencimiento del plazo de veto (10 días hábiles, Ley 2756)",
            usuario: "Sistema",
          },
        }),
      ]);
      await audit({
        accion: "PROMULGACION_AUTOMATICA",
        entidad: "Expediente",
        entidadId: exp.id,
      });
    }
  }
}
