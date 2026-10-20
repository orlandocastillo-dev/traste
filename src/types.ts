export interface Section {
  /** "Estrofa 1", "Coro", "Puente"... */
  name: string;
  /**
   * Cada línea en formato ChordPro: el acorde va entre corchetes justo antes de la sílaba
   * donde cambia. "A[G]mazing [G7]grace". Una línea solo con acordes es un pasaje instrumental.
   */
  lines: string[];
}

export interface Song {
  id: string;
  title: string;
  /** Autor o intérprete. En los himnos, letra y música. */
  artist: string;
  /** Tonalidad original: "G" para Sol mayor, "Bm" para Si menor. */
  key: string;
  lang: "es" | "en";
  sections: Section[];
  year?: number;
  capo?: number;
  note?: string;
  /** Video de YouTube asociado (solo el id, ej. "dQw4w9WgXcQ"). */
  youtubeId?: string;
  tags?: string[];
  /** Canciones creadas o importadas en este dispositivo. */
  custom?: boolean;
}
