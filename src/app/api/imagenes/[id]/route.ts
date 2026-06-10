import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const img = await prisma.imagen.findUnique({ where: { id } });
  if (!img) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return new NextResponse(new Uint8Array(img.datos), {
    headers: {
      "Content-Type": img.mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(img.nombre)}"`,
      "Cache-Control": "public, max-age=86400, immutable",
      "X-Content-Sha256": img.hashSha256,
    },
  });
}
