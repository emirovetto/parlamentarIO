import "dotenv/config";
import { PrismaClient, Role, TipoNormativa, OrigenExpediente, EstadoExpediente, CargoAutoridad, RolComision, TipoDictamen, TipoSesion, EstadoSesion } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Sembrando datos de demostración...");

  const hash = await bcrypt.hash("parlamentario2026", 10);

  // ── Bloques ──
  const bloqueA = await prisma.bloque.upsert({
    where: { nombre: "Frente Renovador Local" },
    update: {},
    create: { nombre: "Frente Renovador Local", partido: "Frente Renovador", color: "#0ea5e9" },
  });
  const bloqueB = await prisma.bloque.upsert({
    where: { nombre: "Juntos por la Ciudad" },
    update: {},
    create: { nombre: "Juntos por la Ciudad", partido: "Juntos por el Cambio", color: "#f59e0b" },
  });
  const bloqueC = await prisma.bloque.upsert({
    where: { nombre: "Unidad Vecinal" },
    update: {},
    create: { nombre: "Unidad Vecinal", partido: "Partido Vecinal", color: "#10b981" },
  });

  // ── Usuarios administrativos ──
  await prisma.user.upsert({
    where: { email: "admin@concejo.gob.ar" },
    update: {},
    create: { email: "admin@concejo.gob.ar", passwordHash: hash, nombre: "Administrador del Sistema", role: Role.ADMIN },
  });
  await prisma.user.upsert({
    where: { email: "secretaria.parlamentaria@concejo.gob.ar" },
    update: {},
    create: { email: "secretaria.parlamentaria@concejo.gob.ar", passwordHash: hash, nombre: "María Pérez", role: Role.SECRETARIO_PARLAMENTARIO },
  });
  await prisma.user.upsert({
    where: { email: "secretaria.administrativa@concejo.gob.ar" },
    update: {},
    create: { email: "secretaria.administrativa@concejo.gob.ar", passwordHash: hash, nombre: "Carlos Gómez", role: Role.SECRETARIO_ADMINISTRATIVO },
  });

  // ── Concejales (con usuario para votar) ──
  const mandatoInicio = new Date("2023-12-10");
  const mandatoFin = new Date("2027-12-09");

  const concejalesData = [
    { nombre: "Laura", apellido: "Fernández", dni: "28111222", partido: "Frente Renovador", bloqueId: bloqueA.id, email: "lfernandez@concejo.gob.ar", presidente: true },
    { nombre: "Javier", apellido: "Sosa", dni: "25333444", partido: "Frente Renovador", bloqueId: bloqueA.id, email: "jsosa@concejo.gob.ar" },
    { nombre: "Romina", apellido: "Acosta", dni: "30555666", partido: "Frente Renovador", bloqueId: bloqueA.id, email: "racosta@concejo.gob.ar" },
    { nombre: "Martín", apellido: "Bianchi", dni: "27777888", partido: "Juntos por el Cambio", bloqueId: bloqueB.id, email: "mbianchi@concejo.gob.ar", vice1: true },
    { nombre: "Sofía", apellido: "Luna", dni: "31999000", partido: "Juntos por el Cambio", bloqueId: bloqueB.id, email: "sluna@concejo.gob.ar" },
    { nombre: "Diego", apellido: "Herrera", dni: "26123456", partido: "Juntos por el Cambio", bloqueId: bloqueB.id, email: "dherrera@concejo.gob.ar" },
    { nombre: "Valeria", apellido: "Molina", dni: "29654321", partido: "Partido Vecinal", bloqueId: bloqueC.id, email: "vmolina@concejo.gob.ar", vice2: true },
    { nombre: "Pablo", apellido: "Quiroga", dni: "32112233", partido: "Partido Vecinal", bloqueId: bloqueC.id, email: "pquiroga@concejo.gob.ar" },
    { nombre: "Ana", apellido: "Vega", dni: "33445566", partido: "Partido Vecinal", bloqueId: bloqueC.id, email: "avega@concejo.gob.ar" },
  ];

  const concejales: { id: string; apellido: string; bloqueId: string }[] = [];
  for (const c of concejalesData) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        passwordHash: hash,
        nombre: `${c.nombre} ${c.apellido}`,
        role: c.presidente ? Role.PRESIDENTE : Role.CONCEJAL,
        bloqueId: c.bloqueId,
      },
    });
    const concejal = await prisma.concejal.upsert({
      where: { dni: c.dni },
      update: {},
      create: {
        nombre: c.nombre,
        apellido: c.apellido,
        dni: c.dni,
        partido: c.partido,
        bloqueId: c.bloqueId,
        userId: user.id,
        mandatoInicio,
        mandatoFin,
        biografia: `${c.nombre} ${c.apellido} es concejal de la ciudad por el partido ${c.partido}. Mandato 2023-2027.`,
      },
    });
    concejales.push({ id: concejal.id, apellido: c.apellido, bloqueId: c.bloqueId });

    if (c.presidente) {
      await prisma.autoridad.create({ data: { cargo: CargoAutoridad.PRESIDENTE, concejalId: concejal.id, desde: mandatoInicio } }).catch(() => {});
    }
    if (c.vice1) {
      await prisma.autoridad.create({ data: { cargo: CargoAutoridad.VICEPRESIDENTE_1, concejalId: concejal.id, desde: mandatoInicio } }).catch(() => {});
    }
    if (c.vice2) {
      await prisma.autoridad.create({ data: { cargo: CargoAutoridad.VICEPRESIDENTE_2, concejalId: concejal.id, desde: mandatoInicio } }).catch(() => {});
    }
  }

  // ── Comisiones ──
  const comisionesNombres = [
    { nombre: "Gobierno y Legislación", descripcion: "Asuntos institucionales, normativa general y legislación." },
    { nombre: "Hacienda y Presupuesto", descripcion: "Presupuesto municipal, tasas, contribuciones y finanzas." },
    { nombre: "Obras Públicas y Urbanismo", descripcion: "Obra pública, planeamiento urbano y uso del suelo." },
    { nombre: "Salud y Medio Ambiente", descripcion: "Salud pública, saneamiento y protección ambiental." },
  ];
  const comisiones: { id: string; nombre: string }[] = [];
  for (const [i, cn] of comisionesNombres.entries()) {
    const com = await prisma.comision.upsert({
      where: { nombre: cn.nombre },
      update: {},
      create: cn,
    });
    comisiones.push({ id: com.id, nombre: com.nombre });
    // 3 miembros por comisión, rotando
    for (let j = 0; j < 3; j++) {
      const concejal = concejales[(i * 2 + j) % concejales.length];
      await prisma.comisionMiembro.upsert({
        where: { comisionId_concejalId: { comisionId: com.id, concejalId: concejal.id } },
        update: {},
        create: {
          comisionId: com.id,
          concejalId: concejal.id,
          rol: j === 0 ? RolComision.PRESIDENTE : j === 1 ? RolComision.VICEPRESIDENTE : RolComision.VOCAL,
        },
      });
    }
  }

  // ── Expedientes de ejemplo en distintos estados ──
  const anio = 2026;
  const expedientesData = [
    {
      numero: 1, tipo: TipoNormativa.ORDENANZA, estado: EstadoExpediente.PROMULGADO,
      caratula: "Creación del Programa Municipal de Huertas Urbanas",
      descripcion: "Establece el programa de huertas comunitarias en espacios públicos.",
      textoCompleto: "ARTÍCULO 1°: Créase el Programa Municipal de Huertas Urbanas con el objeto de promover la producción agroecológica local. ARTÍCULO 2°: La autoridad de aplicación será la Secretaría de Ambiente. ARTÍCULO 3°: Comuníquese al Departamento Ejecutivo Municipal.",
      origen: OrigenExpediente.BLOQUE, bloqueId: bloqueA.id, numeroNorma: "Ordenanza N° 3501/2026",
    },
    {
      numero: 2, tipo: TipoNormativa.ORDENANZA, estado: EstadoExpediente.EN_COMISION,
      caratula: "Regulación de estacionamiento medido en zona céntrica",
      descripcion: "Modifica el régimen de estacionamiento medido y sus tarifas.",
      textoCompleto: "ARTÍCULO 1°: Modifícase el régimen de estacionamiento medido en el área delimitada por las calles San Martín, Belgrano, Rivadavia y Mitre. ARTÍCULO 2°: Las tarifas serán fijadas anualmente por la Ordenanza Tributaria.",
      origen: OrigenExpediente.DEM,
    },
    {
      numero: 3, tipo: TipoNormativa.RESOLUCION, estado: EstadoExpediente.CON_DICTAMEN,
      caratula: "Solicitud de informes al DEM sobre el estado del Hospital Municipal",
      descripcion: "Pedido de informes sobre infraestructura y personal de salud.",
      textoCompleto: "ARTÍCULO 1°: Solicítase al Departamento Ejecutivo Municipal informe sobre el estado edilicio del Hospital Municipal, dotación de personal y equipamiento disponible.",
      origen: OrigenExpediente.BLOQUE, bloqueId: bloqueB.id,
    },
    {
      numero: 4, tipo: TipoNormativa.DECLARACION, estado: EstadoExpediente.INGRESADO,
      caratula: "Declaración de Interés Municipal de la Fiesta del Río",
      descripcion: "Declara de interés municipal la edición 2026 de la Fiesta del Río.",
      textoCompleto: "ARTÍCULO 1°: Declárase de Interés Municipal la Fiesta del Río, edición 2026, a realizarse en la costanera de la ciudad.",
      origen: OrigenExpediente.BLOQUE, bloqueId: bloqueC.id,
    },
    {
      numero: 5, tipo: TipoNormativa.MINUTA_COMUNICACION, estado: EstadoExpediente.COMUNICADO_DEM,
      caratula: "Solicitud de reparación de luminarias en barrio Norte",
      descripcion: "Vecinos reclaman reposición de luminarias en el sector norte.",
      textoCompleto: "ARTÍCULO 1°: El Concejo Municipal vería con agrado que el DEM proceda a la reparación de las luminarias de las calles Los Aromos y Las Heras del barrio Norte.",
      origen: OrigenExpediente.PARTICULAR,
      fechaComunicacionDem: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
  ];

  for (const e of expedientesData) {
    const exp = await prisma.expediente.upsert({
      where: { numero_anio_tipo: { numero: e.numero, anio, tipo: e.tipo } },
      update: {},
      create: { ...e, anio, fechaIngreso: new Date(Date.now() - e.numero * 7 * 24 * 3600 * 1000) },
    });
    await prisma.movimientoExpediente.create({
      data: { expedienteId: exp.id, estadoHasta: EstadoExpediente.INGRESADO, observacion: "Ingreso por Mesa de Entradas (seed)" },
    }).catch(() => {});

    // Autores para los de origen bloque
    if (e.bloqueId) {
      const autor = concejales.find((c) => c.bloqueId === e.bloqueId);
      if (autor) {
        await prisma.expedienteAutor.upsert({
          where: { expedienteId_concejalId: { expedienteId: exp.id, concejalId: autor.id } },
          update: {},
          create: { expedienteId: exp.id, concejalId: autor.id },
        });
      }
    }

    // Giro a comisión para los que están en comisión o con dictamen
    if (e.estado === EstadoExpediente.EN_COMISION || e.estado === EstadoExpediente.CON_DICTAMEN) {
      const comision = comisiones[e.numero % comisiones.length];
      await prisma.giroComision.upsert({
        where: { expedienteId_comisionId: { expedienteId: exp.id, comisionId: comision.id } },
        update: {},
        create: { expedienteId: exp.id, comisionId: comision.id },
      });
      if (e.estado === EstadoExpediente.CON_DICTAMEN) {
        const existing = await prisma.dictamen.findFirst({ where: { expedienteId: exp.id } });
        if (!existing) {
          await prisma.dictamen.create({
            data: {
              expedienteId: exp.id,
              comisionId: comision.id,
              tipo: TipoDictamen.FAVORABLE,
              texto: "Esta comisión aconseja la aprobación del proyecto en los términos presentados.",
            },
          });
        }
      }
    }
  }

  // ── Sesión programada con orden del día ──
  const sesion = await prisma.sesion.upsert({
    where: { numero_anio: { numero: 12, anio } },
    update: {},
    create: {
      numero: 12,
      anio,
      tipo: TipoSesion.ORDINARIA,
      estado: EstadoSesion.PROGRAMADA,
      fecha: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      publicada: true,
    },
  });
  const dictamen = await prisma.dictamen.findFirst({ where: { expediente: { numero: 3, anio } } });
  const exp3 = await prisma.expediente.findFirst({ where: { numero: 3, anio } });
  const puntosExistentes = await prisma.puntoOrdenDelDia.count({ where: { sesionId: sesion.id } });
  if (puntosExistentes === 0) {
    await prisma.puntoOrdenDelDia.createMany({
      data: [
        { sesionId: sesion.id, orden: 1, titulo: "Aprobación del acta de la sesión anterior" },
        { sesionId: sesion.id, orden: 2, titulo: "Asuntos entrados" },
        { sesionId: sesion.id, orden: 3, titulo: "Dictamen: Pedido de informes Hospital Municipal", expedienteId: exp3?.id, dictamenId: dictamen?.id },
      ],
    });
  }

  // ── Audiencia pública de ejemplo ──
  const audienciasCount = await prisma.audienciaPublica.count();
  if (audienciasCount === 0) {
    await prisma.audienciaPublica.create({
      data: {
        titulo: "Audiencia Pública: Nuevo Código de Ordenamiento Urbano",
        descripcion: "Convocatoria a audiencia pública para el tratamiento del proyecto de nuevo Código de Ordenamiento Urbano. Los vecinos podrán inscribirse para exponer su postura.",
        fecha: new Date(Date.now() + 20 * 24 * 3600 * 1000),
        lugar: "Recinto del Concejo Municipal",
        estado: "INSCRIPCION_ABIERTA",
      },
    });
  }

  // ── Configuración del portal ──
  await prisma.configuracionSitio.upsert({
    where: { id: "sitio" },
    update: {},
    create: {
      id: "sitio",
      nombreMunicipio: "Ciudad Demo",
      nombreConcejo: "Concejo Deliberante",
      provincia: "Santa Fe",
      slogan: "El Concejo Municipal, abierto a la ciudadanía",
      direccion: "Av. San Martín 1200 — Ciudad Demo",
      telefono: "(0342) 457-1800",
      email: "concejo@ciudaddemo.gob.ar",
      textoHero: "Seguí los proyectos de ordenanza, las sesiones del cuerpo y la actividad de tus concejales.",
    },
  });

  const paginasDemo = [
    { slug: "el-concejo", titulo: "El Concejo", orden: 1, contenido: "El Honorable Concejo Deliberante es el órgano legislativo del municipio. Integrado por concejales electos por voto popular, sanciona ordenanzas, resoluciones y controla la gestión del Departamento Ejecutivo Municipal conforme a la Ley Orgánica de Municipalidades N° 2756." },
    { slug: "contacto", titulo: "Contacto", orden: 2, contenido: "Dirección: Av. San Martín 1200\nTeléfono: (0342) 457-1800\nEmail: concejo@ciudaddemo.gob.ar\nHorario de atención: lunes a viernes de 8 a 14 hs." },
    { slug: "reglamento", titulo: "Reglamento Interno", orden: 3, contenido: "El Reglamento Interno del Honorable Concejo Deliberante regula el funcionamiento de las sesiones, comisiones, mayorías requeridas y procedimientos parlamentarios." },
  ];
  for (const p of paginasDemo) {
    await prisma.paginaInstitucional.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  const plantillaCount = await prisma.plantillaDocumento.count();
  if (plantillaCount === 0) {
    await prisma.plantillaDocumento.create({
      data: {
        nombre: "Acta de sesión estándar",
        tipo: "ACTA_SESION",
        esDefault: true,
        contenido: `ACTA DE SESIÓN {{tipoSesion}} N° {{numero}}/{{anio}}

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

DESARROLLO:
{{desarrollo}}

Sin otro particular, se da por finalizada la sesión a las {{horaCierre}} horas.

{{secretarioParlamentario}}
Secretario Parlamentario`,
      },
    });
  }

  const noticiasCount = await prisma.noticia.count();
  if (noticiasCount === 0) {
    await prisma.noticia.createMany({
      data: [
        {
          titulo: "Sesión ordinaria con nuevo orden del día publicado",
          slug: "sesion-ordinaria-orden-del-dia",
          resumen: "El Concejo convocó a sesión ordinaria con proyectos de ordenanza en tratamiento.",
          cuerpo: "La Secretaría Parlamentaria informa que se encuentra publicado el Orden del Día de la próxima sesión ordinaria. Los ciudadanos pueden consultar los expedientes en el Digesto Legislativo y seguir la transmisión en vivo desde el portal.",
          categoria: "LEGISLATIVA",
          publicada: true,
          destacada: true,
          publicadaEn: new Date(),
        },
        {
          titulo: "Audiencia pública sobre ordenamiento urbano",
          slug: "audiencia-ordenamiento-urbano",
          resumen: "Vecinos y organizaciones pueden inscribirse para exponer en la audiencia convocada.",
          cuerpo: "Se encuentra abierta la inscripción para la audiencia pública sobre el nuevo Código de Ordenamiento Urbano. La participación ciudadana es un pilar del proceso legislativo local.",
          categoria: "COMUNIDAD",
          publicada: true,
          destacada: true,
          publicadaEn: new Date(),
        },
      ],
    });
  }

  console.log("Seed completado.");
  console.log("Usuarios (contraseña: parlamentario2026):");
  console.log("  admin@concejo.gob.ar (Admin)");
  console.log("  secretaria.parlamentaria@concejo.gob.ar (Sec. Parlamentaria)");
  console.log("  lfernandez@concejo.gob.ar (Presidenta del Concejo)");
  console.log("  jsosa@concejo.gob.ar (Concejal)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
