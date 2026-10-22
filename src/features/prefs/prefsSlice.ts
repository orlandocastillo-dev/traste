import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Notation } from "../../lib/music";

export interface PrefsState {
  notation: Notation;
  /** Mástil espejado para guitarristas zurdos. */
  leftHanded: boolean;
  /** En el diapasón: nombre de la nota o intervalo respecto a la tónica. */
  fretLabels: "notas" | "intervalos";
  /** Tamaño de la letra en la hoja, en píxeles. */
  lyricSize: number;
  // "acordes": letra con acordes encima
  sheetView: "acordes" | "letra";
  theme: "auto" | "claro" | "oscuro";
}

export const LYRIC_SIZES = { min: 15, max: 30 };

export const initialPrefs: PrefsState = { notation: "americana", leftHanded: false, fretLabels: "notas", lyricSize: 19, sheetView: "acordes", theme: "auto" };

const prefsSlice = createSlice({
  name: "prefs",
  initialState: initialPrefs,
  reducers: {
    prefsUpdated(state, action: PayloadAction<Partial<PrefsState>>) {
      Object.assign(state, action.payload);
      state.lyricSize = Math.max(LYRIC_SIZES.min, Math.min(LYRIC_SIZES.max, state.lyricSize));
    },
  },
});

export const { prefsUpdated } = prefsSlice.actions;
export default prefsSlice.reducer;
