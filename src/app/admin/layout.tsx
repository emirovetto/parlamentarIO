import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { ROLE_LABELS, GESTION_INSTITUCIONAL, GESTION_EXPEDIENTES, GESTION_SESIONES, GESTION_PARTICIPACION, GESTION_USUARIOS, GESTION_IMPORTACIONES, PUEDE_VOTAR, hasRole } from "@/lib/rbac";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { imagenUrl } from "@/lib/imagenes";

export const metadata = { title: "Backoffice" };

const NAV: { href: string; label: string; roles?: Role[] }[] = [
  { href: "/admin/mi-espacio", label: "Mi espacio" },
  { href: "/admin", label: "Panel general", roles: [Role.ADMIN, Role.PRESIDENTE, Role.SECRETARIO_PARLAMENTARIO, Role.SECRETARIO_ADMINISTRATIVO] },
  { href: "/admin/expedientes", label: "Mesa de Entradas", roles: GESTION_EXPEDIENTES },
  { href: "/admin/comisiones", label: "Comisiones" },
  { href: "/admin/sesiones", label: "Sesiones", roles: GESTION_SESIONES },
  { href: "/admin/votar", label: "Mi banca (votar)", roles: PUEDE_VOTAR },
  { href: "/admin/usuarios", label: "Usuarios", roles: GESTION_USUARIOS },
  { href: "/admin/concejales", label: "Concejales", roles: GESTION_INSTITUCIONAL },
  { href: "/admin/bloques", label: "Bloques", roles: GESTION_INSTITUCIONAL },
  { href: "/admin/importaciones", label: "Importaciones", roles: GESTION_IMPORTACIONES },
  { href: "/admin/participacion", label: "Participación ciudadana", roles: GESTION_PARTICIPACION },
  { href: "/admin/transparencia", label: "Transparencia", roles: GESTION_INSTITUCIONAL },
  { href: "/admin/auditoria", label: "Auditoría", roles: [Role.ADMIN, Role.PRESIDENTE] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { fotoId: true, nombre: true, concejal: { select: { nombre: true, apellido: true, fotoId: true, fotoUrl: true } } },
  });
  const nombreParts = (dbUser?.nombre ?? user.name ?? "Usuario").split(" ");
  const avatarSrc =
    imagenUrl(dbUser?.fotoId) ??
    (dbUser?.concejal ? imagenUrl(dbUser.concejal.fotoId) ?? dbUser.concejal.fotoUrl : null);

  const items = NAV.filter((item) => !item.roles || hasRole(user.role, item.roles));

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#1e3a5f] text-white md:flex">
        <div className="px-6 py-5">
          <Link href="/admin" className="text-xl font-bold tracking-tight">
            parlamentar<span className="text-sky-400">IO</span>
          </Link>
          <p className="mt-1 text-xs text-slate-300">Backoffice legislativo</p>
        </div>
        <nav aria-label="Navegación principal" className="flex-1 space-y-1 px-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-300">
          <Link href="/" className="underline hover:text-white">
            Ver portal público
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="md:hidden">
            <Link href="/admin" className="font-bold text-[#1e3a5f]">
              parlamentarIO
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/admin/mi-espacio" className="flex items-center gap-3 hover:opacity-90">
              <Avatar
                src={avatarSrc}
                nombre={dbUser?.concejal?.nombre ?? nombreParts[0] ?? "U"}
                apellido={dbUser?.concejal?.apellido ?? (nombreParts.slice(1).join(" ") || " ")}
                size="sm"
              />
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
              </div>
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Salir
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
