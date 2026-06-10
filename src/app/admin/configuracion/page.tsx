import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GESTION_PORTAL } from "@/lib/rbac";
import { CONFIG_ID } from "@/lib/configuracion";
import { imagenUrl } from "@/lib/imagenes";
import { Card, CardHeader, CardBody, Field, inputClass, btnPrimary } from "@/components/ui";
import { ImageUploadField } from "@/components/ImageUploadField";
import { guardarConfiguracion } from "./actions";

export const metadata = { title: "Configuración del portal" };

export default async function ConfiguracionPage() {
  await requireRole(GESTION_PORTAL);
  const config = await prisma.configuracionSitio.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: { id: CONFIG_ID },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Configuración del portal público</h1>
        <p className="mt-1 text-sm text-slate-500">
          Logo, nombre del municipio, colores institucionales y datos de contacto visibles en el sitio.
        </p>
      </div>

      <Card>
        <CardHeader title="Identidad institucional" subtitle="Personalizá el portal para cada concejo municipal" />
        <CardBody>
          <form action={guardarConfiguracion} encType="multipart/form-data" className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del municipio / ciudad" required>
              <input name="nombreMunicipio" required defaultValue={config.nombreMunicipio} className={inputClass} />
            </Field>
            <Field label="Nombre del concejo" required>
              <input name="nombreConcejo" required defaultValue={config.nombreConcejo} className={inputClass} />
            </Field>
            <Field label="Provincia" required>
              <input name="provincia" required defaultValue={config.provincia} className={inputClass} />
            </Field>
            <Field label="Slogan (opcional)">
              <input name="slogan" defaultValue={config.slogan ?? ""} className={inputClass} />
            </Field>
            <Field label="Color primario" required>
              <input name="colorPrimario" type="color" defaultValue={config.colorPrimario} className="h-10 w-20 rounded border border-slate-300" />
            </Field>
            <Field label="Color secundario" required>
              <input name="colorSecundario" type="color" defaultValue={config.colorSecundario} className="h-10 w-20 rounded border border-slate-300" />
            </Field>
            <div className="sm:col-span-2">
              <ImageUploadField label="Logo del concejo / municipio" name="logo" currentSrc={imagenUrl(config.logoId)} />
            </div>
            <Field label="Dirección">
              <input name="direccion" defaultValue={config.direccion ?? ""} className={inputClass} placeholder="Salta 2943 – Santa Fe" />
            </Field>
            <Field label="Teléfono">
              <input name="telefono" defaultValue={config.telefono ?? ""} className={inputClass} />
            </Field>
            <Field label="Email institucional">
              <input name="email" type="email" defaultValue={config.email ?? ""} className={inputClass} />
            </Field>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" name="mostrarSesionEnVivo" id="vivo" defaultChecked={config.mostrarSesionEnVivo} className="rounded" />
              <label htmlFor="vivo" className="text-sm text-slate-700">Mostrar banner de sesión en vivo en el portal</label>
            </div>
            <Field label="YouTube">
              <input name="urlYoutube" type="url" defaultValue={config.urlYoutube ?? ""} className={inputClass} />
            </Field>
            <Field label="Facebook">
              <input name="urlFacebook" type="url" defaultValue={config.urlFacebook ?? ""} className={inputClass} />
            </Field>
            <Field label="Instagram">
              <input name="urlInstagram" type="url" defaultValue={config.urlInstagram ?? ""} className={inputClass} />
            </Field>
            <Field label="Twitter / X">
              <input name="urlTwitter" type="url" defaultValue={config.urlTwitter ?? ""} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Texto del hero (página de inicio)">
                <textarea name="textoHero" rows={3} defaultValue={config.textoHero ?? ""} className={inputClass} placeholder="El Concejo Municipal, abierto a la ciudadanía..." />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Texto del pie de página">
                <textarea name="textoFooter" rows={2} defaultValue={config.textoFooter ?? ""} className={inputClass} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className={btnPrimary}>Guardar configuración</button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
