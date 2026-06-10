import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      concejalId?: string | null;
      bloqueId?: string | null;
    };
  }
  interface User {
    role: Role;
    concejalId?: string | null;
    bloqueId?: string | null;
  }
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.concejalId = user.concejalId;
        token.bloqueId = user.bloqueId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as Role;
        session.user.concejalId = token.concejalId as string | null;
        session.user.bloqueId = token.bloqueId as string | null;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/admin")) {
        return !!auth?.user && auth.user.role !== "CIUDADANO";
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
