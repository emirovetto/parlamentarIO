import Link from "next/link";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/concejales", label: "Concejales" },
  { href: "/digesto", label: "Digesto" },
  { href: "/sesiones", label: "Sesiones" },
  { href: "/transparencia", label: "Transparencia" },
  { href: "/participacion", label: "Participación" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>

      <header className="bg-[#1e3a5f] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            parlamentar<span className="text-sky-400">IO</span>
            <span className="ml-3 hidden text-sm font-normal text-slate-300 sm:inline">
              Concejo Municipal
            </span>
          </Link>
          <nav aria-label="Navegación principal">
            <ul className="flex flex-wrap items-center gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/login"
                  className="ml-2 rounded-lg border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10"
                >
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
              <p className="font-semibold text-slate-700">Concejo Municipal</p>
              <p className="mt-1">Portal de Gobierno Abierto — Ley Orgánica de Municipalidades N° 2756 (Santa Fe)</p>
            </div>
            <ul className="space-y-1">
              <li><Link href="/transparencia" className="hover:underline">Transparencia activa</Link></li>
              <li><Link href="/digesto" className="hover:underline">Digesto Legislativo</Link></li>
              <li><Link href="/participacion" className="hover:underline">Banca del Ciudadano</Link></li>
            </ul>
          </div>
          <p className="mt-6 text-xs text-slate-400">
            Sitio desarrollado conforme a la Ley Nacional 26.653 de Accesibilidad Web (WCAG 2.1) y la Ley 25.326 de Protección de Datos Personales.
          </p>
        </div>
      </footer>
    </div>
  );
}
