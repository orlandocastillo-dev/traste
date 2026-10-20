import { initialPrefs } from "../features/prefs/prefsSlice";
import type { AppStore, PersistedState } from "./store";

// v2: las canciones guardan letra y acordes (ChordPro) en lugar de solo compases.
const KEY = "traste:v2";

/** Solo se guardan las canciones propias y las preferencias; el catálogo se vuelve a pedir. */
export function loadState(): Partial<PersistedState> | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const saved = JSON.parse(raw) as PersistedState;
    // Lo guardado con una versión anterior puede no tener las opciones nuevas.
    return {
      prefs: { ...initialPrefs, ...saved.prefs },
      library: { ...saved.library, videos: saved.library?.videos ?? {} },
    };
  } catch {
    return undefined;
  }
}

export function persist(store: AppStore) {
  let last = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  store.subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const { library, prefs } = store.getState();
      const next = JSON.stringify({ library, prefs });
      if (next === last) return;
      last = next;
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // Sin almacenamiento disponible: la app sigue funcionando en memoria.
      }
    }, 300);
  });
}
