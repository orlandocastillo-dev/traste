import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { parseVideoTitle, watchUrl } from "../../lib/youtube";

export interface VideoInfo {
  id: string;
  /** Título tal como aparece en YouTube. */
  rawTitle: string;
  channel: string;
  /** Canción y artista deducidos del título. */
  title: string;
  artist: string;
}

export interface LyricsResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  plainLyrics: string;
}

interface OEmbed {
  title?: string;
  author_name?: string;
  error?: string;
}

interface LrclibItem {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
}

export type WebError = { message: string };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

// Lo que la app consulta en internet: los datos del video (oEmbed) y la letra (LRCLIB)
export const webApi = createApi({
  reducerPath: "webApi",
  baseQuery: fakeBaseQuery<WebError>(),
  keepUnusedDataFor: 600,
  endpoints: (build) => ({
    videoInfo: build.query<VideoInfo, string>({
      async queryFn(id) {
        const target = encodeURIComponent(watchUrl(id));
        const sources = [`https://noembed.com/embed?url=${target}`, `https://www.youtube.com/oembed?format=json&url=${target}`];
        for (const url of sources) {
          try {
            const data = await getJson<OEmbed>(url);
            if (data.error || !data.title) continue;
            const channel = data.author_name ?? "";
            return { data: { id, rawTitle: data.title, channel, ...parseVideoTitle(data.title, channel) } };
          } catch {
            // Se prueba con la siguiente fuente.
          }
        }
        return { error: { message: "No se pudo leer el título del video. Revisa tu conexión o escribe el nombre de la canción." } };
      },
    }),
    lyricsSearch: build.query<LyricsResult[], { title: string; artist: string }>({
      async queryFn({ title, artist }) {
        const base = "https://lrclib.net/api/search";
        const attempts = [
          artist ? `${base}?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}` : null,
          `${base}?q=${encodeURIComponent(`${title} ${artist}`.trim())}`,
          `${base}?track_name=${encodeURIComponent(title)}`,
        ].filter((u): u is string => !!u);
        try {
          for (const url of attempts) {
            const items = await getJson<LrclibItem[]>(url);
            const usable = items.filter((i) => !i.instrumental && i.plainLyrics?.trim());
            if (usable.length) {
              // La misma letra aparece repetida por cada álbum: se deja una por canción y artista.
              const seen = new Set<string>();
              const unique = usable.filter((i) => {
                const k = `${i.trackName}|${i.artistName}`.toLowerCase();
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
              });
              return { data: unique.slice(0, 6).map((i) => ({ ...i, plainLyrics: i.plainLyrics!.trim() })) };
            }
          }
          return { data: [] };
        } catch {
          return { error: { message: "No se pudo buscar la letra. Revisa tu conexión e inténtalo de nuevo." } };
        }
      },
    }),
  }),
});

export const { useVideoInfoQuery, useLyricsSearchQuery } = webApi;
