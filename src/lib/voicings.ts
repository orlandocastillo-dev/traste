import { chroma, normalizeQuality, parseChord } from "./music";

/** Afinación estándar, de la sexta cuerda (Mi grave) a la primera (Mi aguda), en MIDI. */
export const TUNING = [40, 45, 50, 55, 59, 64];
export const STRING_NAMES = ["E", "A", "D", "G", "B", "E"];

/** -1 = cuerda que no se toca (x), 0 = al aire, n = traste. De la sexta a la primera cuerda. */
export type Frets = [number, number, number, number, number, number];

export interface Voicing {
  frets: Frets;
  /** Traste de la cejilla, si la forma la usa. */
  barre?: number;
  /** El diccionario no tenía el acorde exacto y se muestra una versión más simple. */
  simplified?: boolean;
}

const X = -1;

/** Formas abiertas que todo guitarrista aprende primero. */
const OPEN: Record<string, Frets> = {
  C: [X, 3, 2, 0, 1, 0],
  Cmaj7: [X, 3, 2, 0, 0, 0],
  C7: [X, 3, 2, 3, 1, 0],
  Cadd9: [X, 3, 2, 0, 3, 0],
  "C/G": [3, 3, 2, 0, 1, 0],
  D: [X, X, 0, 2, 3, 2],
  Dm: [X, X, 0, 2, 3, 1],
  D7: [X, X, 0, 2, 1, 2],
  Dm7: [X, X, 0, 2, 1, 1],
  Dmaj7: [X, X, 0, 2, 2, 2],
  Dsus4: [X, X, 0, 2, 3, 3],
  Dsus2: [X, X, 0, 2, 3, 0],
  D5: [X, X, 0, 2, 3, X],
  "D/F#": [2, X, 0, 2, 3, 2],
  E: [0, 2, 2, 1, 0, 0],
  Em: [0, 2, 2, 0, 0, 0],
  E7: [0, 2, 0, 1, 0, 0],
  Em7: [0, 2, 2, 0, 3, 0],
  Esus4: [0, 2, 2, 2, 0, 0],
  E5: [0, 2, 2, X, X, X],
  Fmaj7: [X, X, 3, 2, 1, 0],
  G: [3, 2, 0, 0, 0, 3],
  G7: [3, 2, 0, 0, 0, 1],
  "G/B": [X, 2, 0, 0, 0, 3],
  A: [X, 0, 2, 2, 2, 0],
  Am: [X, 0, 2, 2, 1, 0],
  A7: [X, 0, 2, 0, 2, 0],
  Am7: [X, 0, 2, 0, 1, 0],
  Amaj7: [X, 0, 2, 1, 2, 0],
  Asus4: [X, 0, 2, 2, 3, 0],
  Asus2: [X, 0, 2, 2, 0, 0],
  A7sus4: [X, 0, 2, 0, 3, 0],
  A5: [X, 0, 2, 2, X, X],
  B7: [X, 2, 1, 2, 0, 2],
};

/** Formas móviles con cejilla: desplazamientos respecto al traste donde está la fundamental. */
const E_SHAPE: Record<string, (number | null)[]> = {
  "": [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  "7": [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  maj7: [0, null, 1, 1, 0, null],
  sus4: [0, 2, 2, 2, 0, 0],
  "7sus4": [0, 2, 0, 2, 0, 0],
  "5": [0, 2, 2, null, null, null],
};

const A_SHAPE: Record<string, (number | null)[]> = {
  "": [null, 0, 2, 2, 2, 0],
  m: [null, 0, 2, 2, 1, 0],
  "7": [null, 0, 2, 0, 2, 0],
  m7: [null, 0, 2, 0, 1, 0],
  maj7: [null, 0, 2, 1, 2, 0],
  sus4: [null, 0, 2, 2, 3, 0],
  sus2: [null, 0, 2, 2, 0, 0],
  "7sus4": [null, 0, 2, 0, 3, 0],
  "5": [null, 0, 2, 2, null, null],
  "6": [null, 0, 2, 2, 2, 2],
  m6: [null, 0, 2, 2, 1, 2],
  add9: [null, 0, 2, 4, 2, 0],
  dim: [null, 0, 1, 2, 1, null],
  m7b5: [null, 0, 1, 0, 1, null],
  aug: [null, 0, 3, 2, 2, 1],
  "9": [null, 0, -1, 0, 0, 0],
};

/** Calidades equivalentes que escriben distinto los cancioneros. */
const ALIASES: Record<string, string> = {
  M: "",
  maj: "",
  min: "m",
  "-": "m",
  M7: "maj7",
  "7M": "maj7",
  "m7(b5)": "m7b5",
  ø: "m7b5",
  "°": "dim",
  dim7: "dim",
  "+": "aug",
  sus: "sus4",
  "7(9)": "9",
  add2: "add9",
};

/** Si no hay una forma para la calidad exacta, se toca el acorde básico (mayor o menor). */
function simplify(quality: string): string {
  if (quality.startsWith("m") && !quality.startsWith("maj")) return "m";
  if (quality.startsWith("7") || quality.startsWith("9") || quality.startsWith("13")) return "7";
  return "";
}

function build(template: (number | null)[], fret: number): Frets {
  return template.map((o) => (o === null ? X : fret + o)) as Frets;
}

export function voicingFor(symbol: string): Voicing | null {
  if (OPEN[symbol]) return { frets: OPEN[symbol] };
  const c = parseChord(symbol);
  if (!c) return null;

  // Acorde con bajo que no está en el diccionario: se toca el acorde sin el bajo.
  if (c.bass) {
    const base = voicingFor(`${c.root}${c.quality}`);
    return base ? { ...base, simplified: true } : null;
  }

  const raw = normalizeQuality(c.quality);
  const quality = ALIASES[raw] ?? raw;
  const exact = OPEN[`${c.root}${quality}`] ?? OPEN[`${enharmonic(c.root)}${quality}`];
  if (exact) return { frets: exact };

  const candidates: Voicing[] = [];
  const eFret = mod12(chroma(c.root) - chroma("E"));
  const aFret = mod12(chroma(c.root) - chroma("A"));
  const known = quality in E_SHAPE || quality in A_SHAPE;
  const q = known ? quality : simplify(quality);

  // Con la fundamental al aire (traste 0) las formas móviles se convierten en acordes abiertos.
  if (E_SHAPE[q]) candidates.push(withBarre(build(E_SHAPE[q], eFret), eFret));
  // El "9" con forma de La necesita un traste debajo de la fundamental.
  const aBase = q === "9" && aFret < 1 ? 12 : aFret;
  if (A_SHAPE[q]) candidates.push(withBarre(build(A_SHAPE[q], aBase), aBase));

  const best = candidates.sort((a, b) => maxFret(a.frets) - maxFret(b.frets))[0];
  if (!best) return null;
  return known ? best : { ...best, simplified: true };
}

function withBarre(frets: Frets, fret: number): Voicing {
  return fret > 0 ? { frets, barre: fret } : { frets };
}

function maxFret(frets: Frets): number {
  return Math.max(...frets);
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

function enharmonic(root: string): string {
  const map: Record<string, string> = { "C#": "Db", Db: "C#", "D#": "Eb", Eb: "D#", "F#": "Gb", Gb: "F#", "G#": "Ab", Ab: "G#", "A#": "Bb", Bb: "A#" };
  return map[root] ?? root;
}

/** Notas MIDI que suenan con una posición (para el sonido del acorde). */
export function midiNotes(frets: Frets, capo = 0): number[] {
  return frets.flatMap((f, i) => (f < 0 ? [] : [TUNING[i] + f + capo]));
}

/** Traste inicial que se dibuja en el diagrama: 1 si la forma cabe en los primeros trastes. */
export function baseFret(frets: Frets): number {
  const pressed = frets.filter((f) => f > 0);
  if (pressed.length === 0) return 1;
  const max = Math.max(...pressed);
  return max <= 4 ? 1 : Math.min(...pressed);
}
