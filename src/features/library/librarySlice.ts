import { createEntityAdapter, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Song } from "../../types";

/** Canciones propias del usuario, favoritas y ajustes por canción (tono y cejilla). */
export const customSongsAdapter = createEntityAdapter<Song>({
  sortComparer: (a, b) => a.title.localeCompare(b.title, "es"),
});

export interface SongSettings {
  /** Semitonos de transposición respecto a la tonalidad original. */
  transpose: number;
  capo: number;
}

const initialState = customSongsAdapter.getInitialState({
  favorites: [] as string[],
  settings: {} as Record<string, SongSettings>,
  recent: [] as string[],
  /** Video de YouTube elegido para una canción del catálogo. */
  videos: {} as Record<string, string>,
});

const librarySlice = createSlice({
  name: "library",
  initialState,
  reducers: {
    songSaved: customSongsAdapter.upsertOne,
    songDeleted(state, action: PayloadAction<string>) {
      customSongsAdapter.removeOne(state, action.payload);
      state.favorites = state.favorites.filter((id) => id !== action.payload);
      state.recent = state.recent.filter((id) => id !== action.payload);
      delete state.settings[action.payload];
    },
    favoriteToggled(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.favorites = state.favorites.includes(id) ? state.favorites.filter((f) => f !== id) : [id, ...state.favorites];
    },
    songOpened(state, action: PayloadAction<string>) {
      state.recent = [action.payload, ...state.recent.filter((id) => id !== action.payload)].slice(0, 6);
    },
    transposed(state, action: PayloadAction<{ id: string; delta: number; baseCapo?: number }>) {
      // baseCapo: la cejilla que trae la canción, para no perderla al guardar el primer ajuste.
      const s = (state.settings[action.payload.id] ??= { transpose: 0, capo: action.payload.baseCapo ?? 0 });
      // Se mantiene entre -6 y +6 semitonos: más allá es la misma tonalidad una octava cerca.
      s.transpose = wrap(s.transpose + action.payload.delta);
    },
    capoSet(state, action: PayloadAction<{ id: string; capo: number }>) {
      const s = (state.settings[action.payload.id] ??= { transpose: 0, capo: 0 });
      s.capo = Math.max(0, Math.min(9, action.payload.capo));
    },
    videoLinked(state, action: PayloadAction<{ id: string; youtubeId: string | null }>) {
      const { id, youtubeId } = action.payload;
      const own = state.entities[id];
      if (own) own.youtubeId = youtubeId ?? undefined;
      else if (youtubeId) state.videos[id] = youtubeId;
      else delete state.videos[id];
    },
    settingsReset(state, action: PayloadAction<string>) {
      delete state.settings[action.payload];
    },
  },
});

function wrap(n: number): number {
  const m = ((n % 12) + 12) % 12;
  return m > 6 ? m - 12 : m;
}

export const { songSaved, songDeleted, favoriteToggled, songOpened, transposed, capoSet, settingsReset, videoLinked } = librarySlice.actions;
export default librarySlice.reducer;
