import type { Song } from "../types";

const ID = /^[\w-]{11}$/;

// Saca el id del video de cualquier forma de link de YouTube
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (ID.test(text)) return text;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.slice(1, 12);
    return ID.test(id) ? id : null;
  }
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
  const v = url.searchParams.get("v");
  if (v && ID.test(v)) return v;
  const m = url.pathname.match(/^\/(?:shorts|live|embed|v)\/([\w-]{11})/);
  return m ? m[1] : null;
}

export function isYouTubeLink(input: string): boolean {
  return /youtu\.?be/i.test(input) && parseYouTubeId(input) !== null;
}

export function thumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function watchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function embedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

const NOISE_WORDS =
  /\b(video oficial|official (music )?video|official audio|official lyric video|lyric video|videoclip|video lyric|con letra|letra|lyrics?|en vivo|ao vivo|live|ac[uú]stico|acoustic|audio|hd|4k|visualizer|oficial|official)\b/gi;

/** Palabras que a veces quedan al otro lado del guion y no son un artista: "Canción - Himno". */
const GENERIC = /^(hymn|himno|himnos|worship|adoraci[oó]n|alabanza|cover|karaoke|instrumental|pista|piano|guitarra|guitar|tutorial|acordes|chords)( .*)?$/i;

function cleanChannel(channel: string): string {
  return channel
    .replace(/\s*-\s*topic$/i, "")
    .replace(/vevo$/i, "")
    .replace(/\b(oficial|official|music|m[uú]sica|tv|channel|canal)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function loose(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Del título del video saca canción y artista
export function parseVideoTitle(rawTitle: string, channel = ""): { title: string; artist: string } {
  let t = rawTitle
    .replace(/[([{【][^)\]}】]*[)\]}】]/g, " ")
    .replace(/\s[|｜].*$/, " ")
    .replace(/\b(ft|feat)\.?\s.*$/i, " ")
    .replace(NOISE_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
  t = t.replace(/^[-–—:\s]+|[-–—:\s]+$/g, "");
  const ch = cleanChannel(channel);
  const parts = t.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    const [left, ...rest] = parts;
    const right = rest.join(" - ");
    if (GENERIC.test(right.trim())) return { title: left, artist: ch };
    if (GENERIC.test(left.trim())) return { title: right, artist: ch };
    const chKey = loose(ch);
    // Casi siempre es "Artista - Canción"; si el canal coincide con la derecha, está al revés.
    if (chKey && loose(right).includes(chKey) && !loose(left).includes(chKey)) return { title: left, artist: right };
    return { title: right, artist: left };
  }
  return { title: t || rawTitle.trim(), artist: ch };
}

function words(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
}

/** Qué tan parecido es el título del video al de una canción, de 0 a 1. */
export function titleSimilarity(a: string, b: string): number {
  const wa = new Set(words(a));
  const wb = new Set(words(b));
  if (!wa.size || !wb.size) return 0;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common / Math.min(wa.size, wb.size) - Math.abs(wa.size - wb.size) * 0.05;
}

/** La canción de la biblioteca que corresponde al video, si hay una suficientemente parecida. */
export function findMatch(songs: Song[], title: string, youtubeId?: string): Song | undefined {
  if (youtubeId) {
    const linked = songs.find((s) => s.youtubeId === youtubeId);
    if (linked) return linked;
  }
  let best: Song | undefined;
  let bestScore = 0;
  for (const s of songs) {
    const score = titleSimilarity(title, s.title);
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return bestScore >= 0.75 ? best : undefined;
}
