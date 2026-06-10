import Link from "next/link";
import Image from "next/image";
import { getConfiguracionSitio } from "@/lib/configuracion";
import { prisma } from "@/lib/prisma";

const NAV_BASE = [
  { href: "/", label: "Inicio" },
  { href: "/noticias", label: "Noticias" },
  { href: "/concejales", label: "Concejales" },
  { href: "/comisiones", label: "Comisiones" },
  { href: "/agenda", label: "Agenda" },
  { href: "/digesto", label: "Digesto" },
  { href: "/sesiones", label: "Sesiones" },
  { href: "/transparencia", label: "Transparencia" },
  { href: "/participacion", label: "Participación" },
];

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [config, sesionVivo, paginasInst] = await Promise.all([
    getConfiguracionSitio(),
    prisma.sesion.findFirst({
      where: { estado: "EN_CURSO", publicada: true, videoEnVivoUrl: { not: null } },
    }),
    prisma.paginaInstitucional.findMany({ where: { publicada: true }, orderBy: { orden: "asc" }, take: 5 }),
  ]);

  const showVivo = config.mostrarSesionEnVivo && sesionVivo;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg">
        Saltar al contenido principal
      </a>

      {showVivo ? (
        <div className="bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white">
          <Link href={`/sesiones/${sesionVivo.id}`} className="hover:underline">
            Sesión en vivo — Ver transmisión
          </Link>
        </div>
      ) : null}

      <header className="text-white" style={{ backgroundColor: config.colorPrimario }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            {config.logoSrc ? (
              <Image src={config.logoSrc} alt="" width={48} height={48} className="h-12 w-12 rounded-lg object-contain bg-white/10" unoptimized />
            ) : null}
            <div>
              <span className="text-xl font-bold tracking-tight">{config.nombreConcejo}</span>
              <span className="mt-0.5 block text-sm font-normal text-white/80">
                {config.nombreMunicipio}, {config.provincia}
              </span>
            </div>
          </Link>
          <nav aria-label="Navegación principal">
            <ul className="flex flex-wrap items-center gap-1">
              {NAV_BASE.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10 hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
              {paginasInst.map((p) => (
                <li key={p.id}>
                  <Link href={`/institucional/${p.slug}`} className="rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10">
                    {p.titulo}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/login" className="ml-2 rounded-lg border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10">
                  Acceso institucional
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="font-semibold text-slate-700">{config.nombreConcejo}</p>
              <p className="mt-1">
                {config.textoFooter ?? `Portal de Gobierno Abierto — Ley Orgánica de Municipalidades N° 2756 (${config.provincia})`}
              </p>
              {config.direccion ? <p className="mt-2">{config.direccion}</p> : null}
              {config.telefono ? <p>Tel: {config.telefono}</p> : null}
              {config.email ? (
                <p>
                  <a href={`mailto:${config.email}`} className="text-blue-700 hover:underline">{config.email}</a>
                </p>
              ) : null}
            </div>
            <ul className="space-y-1">
              <li><Link href="/noticias" className="hover:underline">Noticias</Link></li>
              <li><Link href="/agenda" className="hover:underline">Agenda</Link></li>
              <li><Link href="/transparencia" className="hover:underline">Transparencia activa</Link></li>
              <li><Link href="/digesto" className="hover:underline">Digesto Legislativo</Link></li>
            </ul>
          </div>
          {(config.urlYoutube || config.urlFacebook || config.urlInstagram) ? (
            <div className="mt-4 flex gap-4 text-xs">
              {config.urlYoutube ? <a href={config.urlYoutube} target="_blank" rel="noopener noreferrer" className="hover:underline">YouTube</a> : null}
              {config.urlFacebook ? <a href={config.urlFacebook} target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook</a> : null}
              {config.urlInstagram ? <a href={config.urlInstagram} target="_blank" rel="noopener noreferrer" className="hover:underline">Instagram</a> : null}
            </div>
          ) : null}
          <p className="mt-6 text-xs text-slate-400">
            Desarrollado con parlamentarIO — Ley 26.653 (Accesibilidad) y Ley 25.326 (Datos Personales).
          </p>
        </div>
      </footer>
    </div>
  );
}
