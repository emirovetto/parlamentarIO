import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { btnPrimary, inputClass, Field } from "@/components/ui";

export const metadata = { title: "Ingreso al sistema" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin/mi-espacio",
      });
    } catch (e) {
      if (e instanceof AuthError) {
        redirect("/login?error=credenciales");
      }
      throw e;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#1e3a5f] to-[#0f2138] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <p className="text-3xl font-bold tracking-tight">
            parlamentar<span className="text-sky-400">IO</span>
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Sistema de Gestión Legislativa — Concejo Municipal
          </p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="mb-6 text-lg font-semibold text-slate-900">Ingreso al sistema</h1>
          {error === "credenciales" ? (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              Credenciales inválidas. Verificá el email y la contraseña.
            </p>
          ) : null}
          <form action={login} className="space-y-4">
            <Field label="Correo electrónico" required>
              <input name="email" type="email" autoComplete="email" required className={inputClass} placeholder="usuario@concejo.gob.ar" />
            </Field>
            <Field label="Contraseña" required>
              <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
            </Field>
            <button type="submit" className={`${btnPrimary} w-full`}>
              Ingresar
            </button>
          </form>
          <p className="mt-6 text-center text-sm">
            <Link href="/" className="text-slate-500 underline hover:text-slate-700">
              Volver al portal público
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
