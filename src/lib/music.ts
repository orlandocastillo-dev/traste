import { Chord, Note, Scale } from "tonal";

export const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** Tonalidades que se escriben con bemoles (Fa mayor, Si bemol, Re menor...). */
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"]);

export interface ParsedChord {
  root: string;
  /** Todo lo que va después de la fundamental: "m7", "sus4", "maj7"... */
  quality: string;
  bass?: string;
}

const CHORD_RE = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/;

export function parseChord(symbol: string): ParsedChord | null {
  const m = symbol.trim().match(CHORD_RE);
  if (!m) return null;
  return { root: m[1], quality: m[2], bass: m[3] };
}

export function chroma(note: string): number {
  return Note.chroma(note) ?? 0;
}

/** Nombre de la nota con la grafía adecuada (sostenidos o bemoles) para la tonalidad. */
export function spell(pc: number, preferFlats: boolean): string {
  const i = ((pc % 12) + 12) % 12;
  return preferFlats ? FLATS[i] : SHARPS[i];
}

export function usesFlats(key: string): boolean {
  return FLAT_KEYS.has(key);
}

export interface Key {
  tonic: string;
  minor: boolean;
}

export function parseKey(key: string): Key {
  const minor = key.endsWith("m");
  return { tonic: minor ? key.slice(0, -1) : key, minor };
}

export function keyName(key: Key): string {
  return key.tonic + (key.minor ? "m" : "");
}

export function transposeKey(key: string, semitones: number): string {
  const k = parseKey(key);
  const pc = chroma(k.tonic) + semitones;
  // Se prueba primero con sostenidos; si esa tonalidad se escribe con bemoles, se cambia.
  const sharp = keyName({ tonic: spell(pc, false), minor: k.minor });
  if (!FLAT_KEYS.has(sharp)) {
    const flat = keyName({ tonic: spell(pc, true), minor: k.minor });
    if (FLAT_KEYS.has(flat)) return flat;
  }
  return sharp;
}

export function transposeChord(symbol: string, semitones: number, targetKey: string): string {
  const c = parseChord(symbol);
  if (!c || semitones % 12 === 0) return symbol;
  const flats = usesFlats(targetKey);
  const root = spell(chroma(c.root) + semitones, flats);
  const bass = c.bass ? `/${spell(chroma(c.bass) + semitones, flats)}` : "";
  return `${root}${c.quality}${bass}`;
}

/** Con cejilla (capo) en el traste N se tocan las formas de N semitonos más abajo. */
export function shapeWithCapo(symbol: string, capo: number, soundingKey: string): string {
  if (!capo) return symbol;
  return transposeChord(symbol, -capo, transposeKey(soundingKey, -capo));
}

// Notación latina (Do, Re, Mi)

const LATIN: Record<string, string> = { C: "Do", D: "Re", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };

export type Notation = "americana" | "latina";

export function noteLabel(note: string, notation: Notation): string {
  if (notation === "americana") return note;
  return LATIN[note[0]] + note.slice(1);
}

export function chordLabel(symbol: string, notation: Notation): string {
  if (notation === "americana") return symbol;
  const c = parseChord(symbol);
  if (!c) return symbol;
  return `${noteLabel(c.root, "latina")}${c.quality}${c.bass ? `/${noteLabel(c.bass, "latina")}` : ""}`;
}

// Notas de acordes y escalas

/** Clases de altura (0-11) de las notas de un acorde, usando Tonal para la teoría. */
export function chordPitchClasses(symbol: string): number[] {
  const c = parseChord(symbol);
  if (!c) return [];
  const notes = Chord.get(`${c.root}${normalizeQuality(c.quality)}`).notes;
  const pcs = notes.map(chroma);
  if (c.bass) pcs.push(chroma(c.bass));
  return [...new Set(pcs)];
}

/** Tonal entiende "M7" o "maj7"; algunos cancioneros escriben "7M" o "-" para menor. */
export function normalizeQuality(q: string): string {
  return q.replace(/^-/, "m").replace(/^7M$/, "maj7").replace(/^M$/, "");
}

export interface ScaleOption {
  id: string;
  name: string;
  /** Nombre en Tonal, por ejemplo "minor pentatonic". */
  type: string;
  tonic: string;
  why: string;
}

const SCALE_NAMES: Record<string, string> = {
  "major pentatonic": "Pentatónica mayor",
  "minor pentatonic": "Pentatónica menor",
  major: "Mayor (jónica)",
  aeolian: "Menor natural (eólica)",
  dorian: "Dórica",
  mixolydian: "Mixolidia",
  blues: "Blues",
  "harmonic minor": "Menor armónica",
};

export const SCALE_TYPES = Object.keys(SCALE_NAMES);

export function scaleName(type: string): string {
  return SCALE_NAMES[type] ?? type;
}

export function scaleNotes(tonic: string, type: string): string[] {
  return Scale.get(`${tonic} ${type}`).notes;
}

export function relativeMinor(majorTonic: string): string {
  return spell(chroma(majorTonic) + 9, usesFlats(majorTonic));
}

export function relativeMajor(minorTonic: string): string {
  return spell(chroma(minorTonic) + 3, usesFlats(`${minorTonic}m`));
}

// Qué escalas sirven para improvisar sobre la canción, de la más segura a la más colorida
export function suggestScales(key: string, chords: string[] = []): ScaleOption[] {
  const k = parseKey(key);
  const t = k.tonic;
  if (!k.minor) {
    const rel = relativeMinor(t);
    const hasDominant7 = chords.some((c) => {
      const p = parseChord(c);
      return p && chroma(p.root) === chroma(t) && p.quality.startsWith("7");
    });
    return [
      { id: "pm", name: `${scaleName("major pentatonic")} de ${t}`, type: "major pentatonic", tonic: t, why: "Cinco notas que suenan bien sobre todos los acordes. Lo más seguro para rellenos entre frases del canto." },
      { id: "may", name: `${scaleName("major")} de ${t}`, type: "major", tonic: t, why: "Agrega las dos notas que le faltan a la pentatónica. Más melódica: sirve para doblar la melodía o para un solo cantable." },
      { id: "rel", name: `${scaleName("minor pentatonic")} de ${rel}`, type: "minor pentatonic", tonic: rel, why: `Las mismas notas que la pentatónica mayor, pensadas desde ${rel}. Otro dibujo en el mástil para el mismo sonido.` },
      {
        id: "mix",
        name: `${scaleName("mixolydian")} de ${t}`,
        type: "mixolydian",
        tonic: t,
        why: hasDominant7 ? "La canción usa acordes con séptima y la mixolidia encaja con ese color. Muy usada en góspel." : "Como la mayor pero con la séptima bemol. Le da un aire de góspel y rock a los solos.",
      },
    ];
  }
  const fifth = spell(chroma(t) + 7, false);
  const majorFive = chords.some((c) => {
    const p = parseChord(c);
    return p && chroma(p.root) === chroma(fifth) && !p.quality.startsWith("m");
  });
  const options: ScaleOption[] = [
    { id: "pmen", name: `${scaleName("minor pentatonic")} de ${t}`, type: "minor pentatonic", tonic: t, why: "Cinco notas que no chocan con ningún acorde. La base para cualquier solo en menor." },
    { id: "blues", name: `${scaleName("blues")} de ${t}`, type: "blues", tonic: t, why: "La pentatónica menor más la quinta disminuida, la nota de paso que le da el color de blues." },
    { id: "eol", name: `${scaleName("aeolian")} de ${t}`, type: "aeolian", tonic: t, why: "Las siete notas de la tonalidad. Más completa para melodías y arpegios." },
    { id: "dor", name: `${scaleName("dorian")} de ${t}`, type: "dorian", tonic: t, why: "Menor con la sexta mayor. Suena más luminosa: funciona en momentos de ministración." },
  ];
  if (majorFive) {
    options.splice(2, 0, {
      id: "arm",
      name: `${scaleName("harmonic minor")} de ${t}`,
      type: "harmonic minor",
      tonic: t,
      why: `La canción tiene ${fifth} mayor (quinto grado). La menor armónica tiene la nota que forma ese acorde y suena justo encima de él.`,
    });
  }
  return options;
}

/** Intervalo de una nota respecto a la tónica, como lo nombra un guitarrista: 1, b3, 5, b7... */
export function intervalLabel(pc: number, tonicPc: number): string {
  const names = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"];
  return names[(((pc - tonicPc) % 12) + 12) % 12];
}

// Los acordes que pertenecen a la tonalidad, en el orden de los grados
export function diatonicChords(key: string): string[] {
  const k = parseKey(key);
  const flats = usesFlats(key);
  const t = chroma(k.tonic);
  const steps: [number, string][] = k.minor
    ? [[0, "m"], [3, ""], [5, "m"], [7, "m"], [7, ""], [8, ""], [10, ""]]
    : [[0, ""], [2, "m"], [4, "m"], [5, ""], [7, ""], [9, "m"], [7, "7"]];
  return steps.map(([semis, q]) => spell(t + semis, flats) + q);
}

export interface KeyFit {
  key: string;
  score: number;
  /** Cuántos acordes de la progresión pertenecen a la tonalidad. */
  inKey: number;
  total: number;
}

/** "m" si el acorde es menor (o disminuido), "" si es mayor: lo que importa para saber si cabe en una tonalidad. */
function signature(c: ParsedChord): string {
  const q = c.quality;
  const minor = (q.startsWith("m") && !q.startsWith("maj")) || q.startsWith("dim") || q.startsWith("°");
  return `${chroma(c.root)}${minor ? "m" : ""}`;
}

// Ordena las tonalidades posibles para una progresión
export function rankKeys(chords: string[]): KeyFit[] {
  const parsed = chords.map(parseChord).filter((c): c is ParsedChord => !!c);
  if (!parsed.length) return [];
  const fits: KeyFit[] = [];
  for (const cand of [...SHARPS, ...SHARPS.map((n) => `${n}m`)]) {
    const key = transposeKey(cand, 0);
    const diatonic = new Set(diatonicChords(key).map((c) => signature(parseChord(c)!)));
    // El acorde de séptimo grado (disminuido) también pertenece, aunque casi no se use en alabanza.
    const k = parseKey(key);
    diatonic.add(`${(chroma(k.tonic) + (k.minor ? 2 : 11)) % 12}m`);
    const tonicSig = `${chroma(k.tonic)}${k.minor ? "m" : ""}`;
    const inKey = parsed.filter((c) => diatonic.has(signature(c))).length;
    let score = inKey;
    if (signature(parsed[0]) === tonicSig) score += 2;
    if (signature(parsed[parsed.length - 1]) === tonicSig) score += 1.5;
    // Entre una mayor y su relativa menor, gana la mayor salvo evidencia.
    if (k.minor) score -= 0.5;
    fits.push({ key, score, inKey, total: parsed.length });
  }
  return fits.sort((a, b) => b.score - a.score);
}

/** Adivina la tonalidad a partir de los acordes. */
export function guessKey(chords: string[]): string | null {
  return rankKeys(chords)[0]?.key ?? null;
}

const MAJOR_DEGREES = ["I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII"];
const MINOR_DEGREES = ["I", "bII", "II", "III", "#III", "IV", "#IV", "V", "VI", "#VI", "VII", "#VII"];

// El grado del acorde en la tonalidad, como lo cifran los músicos
export function romanNumeral(symbol: string, key: string): string {
  const c = parseChord(symbol);
  if (!c) return "?";
  const k = parseKey(key);
  const degree = (chroma(c.root) - chroma(k.tonic) + 12) % 12;
  const base = (k.minor ? MINOR_DEGREES : MAJOR_DEGREES)[degree];
  const q = c.quality;
  const isMinor = q.startsWith("m") && !q.startsWith("maj");
  const isDim = q.startsWith("dim") || q.startsWith("°") || q === "m7b5";
  const numeral = isMinor || isDim ? base.replace(/[IV]+/, (m) => m.toLowerCase()) : base;
  const rest = isDim ? (q === "m7b5" ? "ø7" : "°") : isMinor ? q.replace(/^m(in)?/, "") : q;
  return numeral + rest + (c.bass ? `/${spell(chroma(c.bass), usesFlats(key))}` : "");
}

/** Si el acorde pertenece a la tonalidad (o es el V mayor de una tonalidad menor). */
export function isInKey(symbol: string, key: string): boolean {
  const c = parseChord(symbol);
  if (!c) return false;
  const k = parseKey(key);
  const diatonic = new Set(diatonicChords(key).map((d) => signature(parseChord(d)!)));
  diatonic.add(`${(chroma(k.tonic) + (k.minor ? 2 : 11)) % 12}m`);
  return diatonic.has(signature(c));
}
