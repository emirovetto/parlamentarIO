import { Field, inputClass, btnPrimary } from "@/components/ui";
import { ImageUploadField } from "@/components/ImageUploadField";
import { imagenUrl } from "@/lib/imagenes";
import { CATEGORIA_NOTICIA } from "@/lib/format";
import type { CategoriaNoticia, Noticia } from "@/generated/prisma/client";

export function NoticiaForm({
  action,
  noticia,
}: {
  action: (formData: FormData) => Promise<void>;
  noticia?: Noticia;
}) {
  return (
    <form action={action} encType="multipart/form-data" className="grid gap-4">
      <Field label="Título" required>
        <input name="titulo" required minLength={5} defaultValue={noticia?.titulo} className={inputClass} />
      </Field>
      <Field label="Resumen (bajada)">
        <textarea name="resumen" rows={2} defaultValue={noticia?.resumen ?? ""} className={inputClass} />
      </Field>
      <Field label="Categoría" required>
        <select name="categoria" required defaultValue={noticia?.categoria ?? "GENERAL"} className={inputClass}>
          {(Object.keys(CATEGORIA_NOTICIA) as CategoriaNoticia[]).map((c) => (
            <option key={c} value={c}>{CATEGORIA_NOTICIA[c]}</option>
          ))}
        </select>
      </Field>
      <ImageUploadField label="Imagen destacada" name="imagen" currentSrc={noticia ? imagenUrl(noticia.imagenId) : null} />
      <Field label="Cuerpo de la noticia" required>
        <textarea name="cuerpo" required minLength={20} rows={12} defaultValue={noticia?.cuerpo} className={inputClass} />
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="publicada" defaultChecked={noticia?.publicada} className="rounded" />
          Publicar en el portal
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="destacada" defaultChecked={noticia?.destacada} className="rounded" />
          Destacar en inicio
        </label>
      </div>
      <button type="submit" className={btnPrimary}>Guardar noticia</button>
    </form>
  );
}
