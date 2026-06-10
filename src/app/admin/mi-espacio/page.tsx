import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getWorkspace } from "@/lib/workspace";
import { imagenUrl } from "@/lib/imagenes";
import { Avatar } from "@/components/Avatar";
import { BloqueLogo } from "@/components/BloqueLogo";
import { Card, CardHeader, CardBody, Badge, EmptyState, StatCard } from "@/components/ui";
import {
  nroExpediente,
  fecha,
  fechaHora,
  ESTADO_EXPEDIENTE,
  ESTADO_COLOR,
  TIPO_NORMATIVA,
  TIPO_TAREA,
  PRIORIDAD_TAREA,
  PRIORIDAD_COLOR,
} from "@/lib/format";
import { ROLE_LABELS, hasRole, GESTION_SESIONES } from "@/lib/rbac";
import { completarTarea } from "./actions";
import { TareaForm } from "./TareaForm";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Mi espacio de trabajo" };

function TareaLista({
  tareas,
  titulo,
  vacio,
}: {
  tareas: Awaited<ReturnType<typeof getWorkspace>>["tareasHoy"];
  titulo: string;
  vacio: string;
}) {
  if (tareas.length === 0) {
    return <EmptyState>{vacio}</EmptyState>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {tareas.map((t) => (
        <li key={t.id} className="flex items-start justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={PRIORIDAD_COLOR[t.prioridad]}>{PRIORIDAD_TAREA[t.prioridad]}</Badge>
              <Badge className="bg-slate-100 text-slate-600">{TIPO_TAREA[t.tipo]}</Badge>
              {t.automatica ? (
                <span className="text-xs text-slate-400">automática</span>
              ) : null}
            </div>
            {t.link ? (
              <Link href={t.link} className="mt-1 block text-sm font-medium text-slate-900 hover:underline">
                {t.titulo}
              </Link>
            ) : (
              <p className="mt-1 text-sm font-medium text-slate-900">{t.titulo}</p>
            )}
            {t.descripcion ? <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{t.descripcion}</p> : null}
            {t.fechaLimite ? <p className="mt-1 text-xs text-slate-400">{fechaHora(t.fechaLimite)}</p> : null}
          </div>
          {!t.automatica && t.estado !== "COMPLETADA" ? (
            <form action={completarTarea.bind(null, t.id)}>
              <button type="submit" className="shrink-0 rounded-lg border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50">
                Hecho
              </button>
            </form>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default async function MiEspacioPage() {
  const user = await requireUser();
  const { tareasHoy, tareasProximas, proyectos, perfil } = await getWorkspace(user.id, user.role, user.concejalId);

  const puedeAsignar = hasRole(user.role, GESTION_SESIONES) || user.role === "ADMIN";
  const asignables = puedeAsignar
    ? await Promise.all([
        prisma.user.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
        prisma.concejal.findMany({ where: { activo: true }, orderBy: { apellido: "asc" }, select: { id: true, nombre: true, apellido: true } }),
      ])
    : [[], []];

  const esConcejal = perfil && "apellido" in perfil;
  const nombre = esConcejal ? `${perfil.nombre} ${perfil.apellido}` : (perfil?.nombre ?? user.name ?? "");
  const apellido = esConcejal ? perfil.apellido : "";
  const primerNombre = esConcejal ? perfil.nombre : (user.name?.split(" ")[0] ?? "Usuario");
  const fotoSrc = esConcejal
    ? imagenUrl(perfil.fotoId) ?? perfil.fotoUrl
    : perfil && "fotoId" in perfil
      ? imagenUrl(perfil.fotoId)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            src={fotoSrc}
            nombre={esConcejal ? perfil.nombre : primerNombre}
            apellido={esConcejal ? perfil.apellido : (user.name?.split(" ").slice(1).join(" ") || " ")}
            size="xl"
          />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Mi espacio de trabajo</h1>
            <p className="text-slate-600">{nombre}</p>
            <p className="text-sm text-slate-500">{ROLE_LABELS[user.role]}</p>
            {esConcejal && perfil.bloque ? (
              <div className="mt-2 flex items-center gap-2">
                <BloqueLogo
                  nombre={perfil.bloque.nombre}
                  color={perfil.bloque.color}
                  logoSrc={imagenUrl(perfil.bloque.logoId)}
                  size={24}
                />
                <span className="text-sm text-slate-600">{perfil.bloque.nombre}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.concejalId ? (
            <Link href={`/concejales/${user.concejalId}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Ver perfil público
            </Link>
          ) : null}
          <Link href="/admin/votar" className="rounded-lg bg-[#1e3a5f] px-3 py-2 text-sm text-white hover:bg-[#2a4f7a]">
            Mi banca
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tareas para hoy" value={tareasHoy.length} hint="Del sistema y asignadas" />
        <StatCard label="Próximas tareas" value={tareasProximas.length} />
        {user.concejalId ? (
          <StatCard label="Mis proyectos" value={proyectos.length} hint="Presentados o co-autoría" />
        ) : (
          <StatCard label="Rol" value={ROLE_LABELS[user.role]} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tareas para hoy" />
          <TareaLista tareas={tareasHoy} titulo="Hoy" vacio="No hay tareas pendientes para hoy." />
        </Card>

        <Card>
          <CardHeader title="Próximas tareas y recordatorios" />
          <TareaLista tareas={tareasProximas} titulo="Próximas" vacio="No hay tareas programadas." />
        </Card>
      </div>

      {user.concejalId && proyectos.length > 0 ? (
        <Card>
          <CardHeader
            title="Mis proyectos legislativos"
            action={
              <Link href="/admin/expedientes" className="text-sm text-blue-700 underline">
                Mesa de entradas
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <th className="px-5 py-2">Expediente</th>
                  <th className="px-5 py-2">Carátula</th>
                  <th className="px-5 py-2">Tipo</th>
                  <th className="px-5 py-2">Ingreso</th>
                  <th className="px-5 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proyectos.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-3">
                      <Link href={`/admin/expedientes/${e.id}`} className="font-medium text-blue-700 hover:underline">
                        {nroExpediente(e)}
                      </Link>
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-slate-700">{e.caratula}</td>
                    <td className="px-5 py-3 text-slate-600">{TIPO_NORMATIVA[e.tipo]}</td>
                    <td className="px-5 py-3 text-slate-500">{fecha(e.fechaIngreso)}</td>
                    <td className="px-5 py-3">
                      <Badge className={ESTADO_COLOR[e.estado]}>{ESTADO_EXPEDIENTE[e.estado]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {esConcejal && perfil.comisiones && perfil.comisiones.length > 0 ? (
        <Card>
          <CardHeader title="Comisiones que integrás" />
          <CardBody>
            <ul className="flex flex-wrap gap-2">
              {perfil.comisiones.map((c) => (
                <li key={c.id}>
                  <Link
                    href="/admin/comisiones"
                    className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200"
                  >
                    {c.comision.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {puedeAsignar ? (
        <Card>
          <CardHeader title="Asignar tarea a concejal o secretario" />
          <CardBody>
            <TareaForm usuarios={asignables[0]} concejales={asignables[1]} />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
