import { youtubeEmbedUrl } from "@/lib/youtube";

export function YoutubeEmbed({ url, title }: { url: string; title: string }) {
  const embed = youtubeEmbedUrl(url);
  if (!embed) return null;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-black">
      <iframe
        src={embed}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}
