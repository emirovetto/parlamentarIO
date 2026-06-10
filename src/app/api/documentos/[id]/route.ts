import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.documento.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (!doc.publico) {
    const session = await auth();
    if (!session?.user || session.user.role === "CIUDADANO") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  return new NextResponse(new Uint8Array(doc.datos), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.nombre)}"`,
      "X-Content-Sha256": doc.hashSha256,
    },
  });
}
