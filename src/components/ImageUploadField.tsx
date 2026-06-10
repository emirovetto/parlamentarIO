import { Field } from "@/components/ui";
import Image from "next/image";

export function ImageUploadField({
  label,
  name = "foto",
  currentSrc,
  hint,
}: {
  label: string;
  name?: string;
  currentSrc?: string | null;
  hint?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-4">
        {currentSrc ? (
          <Image
            src={currentSrc}
            alt="Vista previa"
            width={64}
            height={64}
            className="h-16 w-16 rounded-lg object-cover border border-slate-200"
            unoptimized
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
            Sin imagen
          </div>
        )}
        <input
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">{hint ?? "JPEG, PNG o WebP · máx. 2 MB"}</p>
    </Field>
  );
}
