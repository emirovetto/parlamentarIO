import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { hasRole } from "@/lib/rbac";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireRole(allowed: Role[]) {
  const user = await requireUser();
  if (!hasRole(user.role, allowed)) redirect("/admin?error=sin-permiso");
  return user;
}
