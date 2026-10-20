import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import { chordsInLine, lyricsOf, transposeLine } from "../../lib/chordpro";
import { transposeKey } from "../../lib/music";
import type { Song } from "../../types";
import { catalogApi } from "../catalog/catalogApi";
import { customSongsAdapter, type SongSettings } from "./librarySlice";

const customSelectors = customSongsAdapter.getSelectors<RootState>((s) => s.library);
export const selectCustomSongs = customSelectors.selectAll;

const selectCatalogResult = catalogApi.endpoints.getCatalog.select();

/** Catálogo + canciones propias en una sola lista. */
export const selectAllSongs = createSelector(
  [selectCatalogResult, selectCustomSongs, (s: RootState) => s.library.videos],
  (result, custom, videos) => [
    ...custom,
    ...(result.data ?? []).map((song) => (videos[song.id] ? { ...song, youtubeId: videos[song.id] } : song)),
  ],
);

export const DEFAULT_SETTINGS: SongSettings = { transpose: 0, capo: 0 };

export function settingsFor(state: RootState, id: string, song?: Song): SongSettings {
  return state.library.settings[id] ?? { transpose: 0, capo: song?.capo ?? 0 };
}

/** La canción con la transposición aplicada: tonalidad y acordes que suenan. */
export function transposeSong(song: Song, semitones: number): Song {
  if (!semitones) return song;
  const key = transposeKey(song.key, semitones);
  return {
    ...song,
    key,
    sections: song.sections.map((s) => ({ ...s, lines: s.lines.map((l) => transposeLine(l, semitones, key)) })),
  };
}

/** Los acordes en el orden en que aparecen por primera vez. */
export function uniqueChords(song: Song): string[] {
  return [...new Set(song.sections.flatMap((s) => s.lines.flatMap(chordsInLine)))];
}

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9#\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Busca por título, autor, etiqueta, un verso de la letra o un acorde exacto ("F#m"). */
export function searchSongs(songs: Song[], query: string): Song[] {
  const raw = query.trim();
  const q = normalize(raw);
  if (!q) return songs;
  return songs.filter((s) => {
    if (uniqueChords(s).some((c) => c.toLowerCase() === raw.toLowerCase())) return true;
    const meta = normalize(`${s.title} ${s.artist} ${(s.tags ?? []).join(" ")}`);
    if (q.split(" ").every((w) => meta.includes(w))) return true;
    return q.length >= 4 && normalize(s.sections.flatMap((x) => x.lines.map(lyricsOf)).join(" ")).includes(q);
  });
}
