import { notFound } from "next/navigation";
import { getEstadoRecintoPantalla } from "@/lib/recinto-pantalla";
import { PantallaEscalador } from "@/components/PantallaEscalador";
import { RecintoPantallaView } from "@/components/RecintoPantallaView";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function RecintoPantallaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const estado = await getEstadoRecintoPantalla(id);
  if (!estado) notFound();

  return (
    <>
      <AutoRefresh intervalMs={2000} />
      <PantallaEscalador>
        <RecintoPantallaView estado={estado} />
      </PantallaEscalador>
    </>
  );
}
