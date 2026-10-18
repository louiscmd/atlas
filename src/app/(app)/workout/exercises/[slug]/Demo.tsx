"use client";
import { useState } from "react";
import { ExternalLink, MonitorPlay, Play } from "lucide-react";

/**
 * Curated YouTube demonstration. The player only loads after the user taps
 * (privacy-enhanced youtube-nocookie domain, no third-party requests before).
 * Without a curated video we link to a YouTube search rather than embedding
 * an unverified video.
 */
export function Demo({ name, video }: { name: string; video: { youtubeId: string; title: string; channel: string; thumbnailUrl: string } | null }) {
  const [play, setPlay] = useState(false);
  if (!video) {
    const q = encodeURIComponent(`${name} exercise proper form`);
    return (
      <div id="demo" className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-6 py-10 text-center">
        <MonitorPlay className="size-8 text-fg-3" aria-hidden />
        <p className="t-small max-w-sm text-fg-2">A curated demonstration hasn't been added for this exercise yet.</p>
        <a href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-btn)] bg-surface-2 px-4 font-semibold hover:bg-surface-3">
          <Play className="size-4" />Watch Demonstration<ExternalLink className="size-3.5 text-fg-3" />
        </a>
        <p className="text-[11px] text-fg-3">Opens YouTube search results in a new tab.</p>
      </div>
    );
  }
  return (
    <figure id="demo" className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="relative aspect-video bg-black">
        {play ? (
          <iframe className="absolute inset-0 size-full" src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`} title={video.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        ) : (
          <button onClick={() => setPlay(true)} className="group absolute inset-0" aria-label={`Watch Demonstration: ${video.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={video.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover opacity-80" />
            <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-contrast shadow-lg transition-transform group-hover:scale-105"><Play className="size-4" />Watch Demonstration</span></span>
          </button>
        )}
      </div>
      <figcaption className="t-small flex justify-between gap-3 px-4 py-3 text-fg-2"><span className="truncate">{video.title}</span><span className="shrink-0 text-fg-3">{video.channel}</span></figcaption>
    </figure>
  );
}
