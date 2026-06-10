import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardHeader, CardBody, Badge } from "@/components/ui";
import { TIPO_SESION, TIPO_VOTACION, MAYORIA, VALOR_VOTO } from "@/lib/format";
import { AutoRefresh } from "@/components/AutoRefresh";
import { emitirVoto } from "../sesiones/actions";
import { ValorVoto } from "@/generated/prisma/client";

export const metadata = { title: "Mi banca" };

export default async function VotarPage() {
  const user = await requireUser();

  if (!user.concejalId) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">
              Esta vista es exclusiva para concejales con banca. Tu usuario no está vinculado a un concejal.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const sesionEnCurso = await prisma.sesion.findFirst({
    where: { estado: "EN_CURSO" },
    include: {
      asistencias: { where: { concejalId: user.concejalId } },
      votaciones: {
        where: { abierta: true },
        include: { votos: { where: { concejalId: user.concejalId } } },
      },
    },
  });

  const presente = sesionEnCurso?.asistencias[0]?.presente ?? false;
  const votacion = sesionEnCurso?.votaciones[0];
  const miVoto = votacion?.votos[0];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <AutoRefresh intervalMs={4000} />
      <h1 className="text-center text-2xl font-semibold text-slate-900">Mi banca</h1>

      {!sesionEnCurso ? (
        <Card>
          <CardBody>
            <p className="text-center text-sm text-slate-500">No hay sesión en curso en este momento.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardBody className="text-center">
              <p className="text-sm text-slate-600">
                Sesión {TIPO_SESION[sesionEnCurso.tipo]} N° {sesionEnCurso.numero}/{sesionEnCurso.anio}
              </p>
              <Badge className={`mt-2 ${presente ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {presente ? "Estás registrado como presente" : "No figurás como presente — pedí al Secretario que registre tu asistencia"}
              </Badge>
            </CardBody>
          </Card>

          {votacion && presente ? (
            <Card>
              <CardHeader
                title="Votación en curso"
                subtitle={`${TIPO_VOTACION[votacion.tipo]} · ${MAYORIA[votacion.mayoria]}`}
              />
              <CardBody className="space-y-4">
                <p className="text-center text-lg font-medium text-slate-900">{votacion.titulo}</p>
                {miVoto ? (
                  <p className="text-center" aria-live="polite">
                    <Badge className="bg-blue-100 px-4 py-1 text-sm text-blue-800">
                      Tu voto: {VALOR_VOTO[miVoto.valor]}
                    </Badge>
                  </p>
                ) : null}
                <div className="grid grid-cols-1 gap-3">
                  <form action={emitirVoto.bind(null, votacion.id, ValorVoto.AFIRMATIVO)}>
                    <button type="submit" className="w-full rounded-xl bg-green-600 py-5 text-lg font-bold text-white hover:bg-green-700">
                      AFIRMATIVO
                    </button>
                  </form>
                  <form action={emitirVoto.bind(null, votacion.id, ValorVoto.NEGATIVO)}>
                    <button type="submit" className="w-full rounded-xl bg-red-600 py-5 text-lg font-bold text-white hover:bg-red-700">
                      NEGATIVO
                    </button>
                  </form>
                  <form action={emitirVoto.bind(null, votacion.id, ValorVoto.ABSTENCION)}>
                    <button type="submit" className="w-full rounded-xl bg-amber-500 py-4 text-base font-bold text-white hover:bg-amber-600">
                      ABSTENCIÓN
                    </button>
                  </form>
                </div>
                <p className="text-center text-xs text-slate-500">Podés cambiar tu voto mientras la votación esté abierta.</p>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <p className="text-center text-sm text-slate-500">
                  {presente ? "No hay votación abierta. La pantalla se actualiza sola." : ""}
                </p>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
