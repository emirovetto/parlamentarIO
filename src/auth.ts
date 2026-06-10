import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { audit } from "@/lib/audit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { concejal: { select: { id: true } } },
        });
        if (!user || !user.activo) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        await audit({
          userId: user.id,
          accion: "LOGIN",
          entidad: "User",
          entidadId: user.id,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          role: user.role,
          concejalId: user.concejal?.id ?? null,
          bloqueId: user.bloqueId,
        };
      },
    }),
  ],
});
