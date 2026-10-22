import type { Section } from "../types";
import { parseChord, transposeChord } from "./music";

/** Un trozo de letra con el acorde que suena desde su primera sílaba. */
export interface Piece {
  chord?: string;
  text: string;
}

/** Una palabra: puede tener acordes a mitad ("gra[C]cia"), pero no se parte al cambiar de línea. */
export type Word = Piece[];

const CHORD_TAG = /\[([^\]]+)\]/g;

/** "A[G]mazing [G7]grace" → [{text:"A"}, {chord:"G", text:"mazing "}, {chord:"G7", text:"grace"}] */
export function parsePieces(line: string): Piece[] {
  const pieces: Piece[] = [];
  let last = 0;
  let chord: string | undefined;
  for (const m of line.matchAll(CHORD_TAG)) {
    const text = line.slice(last, m.index);
    if (text || chord) pieces.push(chord ? { chord, text } : { text });
    chord = m[1].trim();
    last = m.index + m[0].length;
  }
  const tail = line.slice(last);
  if (tail || chord) pieces.push(chord ? { chord, text: tail } : { text: tail });
  return pieces;
}

/** Separa una línea en palabras para que el navegador solo la parta entre palabras. */
export function lineToWords(line: string): Word[] {
  return line
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => parsePieces(token));
}

/** Un acorde en cifrado americano bien escrito: "G", "F#m7", "Bm7b5", "D/F#", "Asus4". */
export function isChord(symbol: string): boolean {
  return !!parseChord(symbol) && isPlausibleChord(symbol.trim());
}

export function chordsInLine(line: string): string[] {
  return [...line.matchAll(CHORD_TAG)].map((m) => m[1].trim()).filter(isChord);
}

export function lyricsOf(line: string): string {
  return line.replace(CHORD_TAG, "");
}

export function transposeLine(line: string, semitones: number, targetKey: string): string {
  if (!semitones) return line;
  return line.replace(CHORD_TAG, (whole, c: string) => (isChord(c) ? `[${transposeChord(c.trim(), semitones, targetKey)}]` : whole));
}

// Pone (o quita, con null) el acorde al inicio de la palabra número `index` de la línea
export function setChordAtWord(line: string, index: number, chord: string | null): string {
  const parts = line.split(/(\s+)/);
  let n = -1;
  return parts
    .map((part) => {
      if (!part || /^\s+$/.test(part)) return part;
      n++;
      if (n !== index) return part;
      const bare = part.replace(/^\[[^\]]*\]/, "");
      return chord ? `[${chord}]${bare}` : bare;
    })
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** El acorde que empieza en la palabra `index`, si hay uno. */
export function chordAtWord(line: string, index: number): string | undefined {
  const word = line.split(/\s+/).filter(Boolean)[index];
  return word?.match(/^\[([^\]]+)\]/)?.[1];
}

// Cifrado latino (Do, Re, Mi)

const LATIN_ROOTS: [RegExp, string][] = [
  [/^Sol/, "G"],
  [/^Do/, "C"],
  [/^Re/, "D"],
  [/^Mi/, "E"],
  [/^Fa/, "F"],
  [/^La/, "A"],
  [/^Si/, "B"],
];

// "Rem7" → "Dm7", "Sol/Si" → "G/B"
export function latinToAmerican(symbol: string): string | null {
  const convert = (part: string) => {
    for (const [re, en] of LATIN_ROOTS) if (re.test(part)) return part.replace(re, en);
    return null;
  };
  const [main, bass] = symbol.split("/");
  const m = convert(main);
  if (!m) return null;
  const b = bass ? convert(bass) : undefined;
  if (bass && !b) return null;
  const result = b ? `${m}/${b}` : m;
  return isChord(result) ? result : null;
}

/** Acepta cifrado americano o latino y devuelve el americano. */
export function readChord(token: string): string | null {
  const t = token.trim();
  if (!t) return null;
  // "Do" y "Fa" empiezan con letra de nota: se prueba primero americano y luego latino.
  if (isChord(t)) return t;
  return latinToAmerican(t);
}

/** Descarta palabras que empiezan como acorde pero no lo son ("Bendito", "Amén", "Dios"). */
function isPlausibleChord(t: string): boolean {
  return /^[A-G][#b]?((m|min|maj|M|dim|aug|sus|add|°|ø|\+|-)?[0-9]{0,2}(sus[24]?|add[0-9]+|b[0-9]+|#[0-9]+|maj[0-9]*)*)?(\/[A-G][#b]?)?$/.test(t);
}

// Hoja de acordes "encima de la letra"

const NOISE = /^(\||-|x\d+|\(|\)|%|\.+)$/i;

/** Una línea de hoja de acordes: todo lo que tiene son acordes (y separadores como | o x2). */
export function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const chords = tokens.filter((t) => readChord(t.replace(/[()]/g, "")));
  return chords.length > 0 && tokens.every((t) => readChord(t.replace(/[()]/g, "")) || NOISE.test(t));
}

/** Acordes con su columna en una línea de acordes. */
function chordColumns(line: string): { col: number; chord: string }[] {
  return [...line.matchAll(/\S+/g)]
    .map((m) => ({ col: m.index, chord: readChord(m[0].replace(/[()]/g, "")) }))
    .filter((x): x is { col: number; chord: string } => !!x.chord);
}

/** Inserta los acordes de una línea de acordes sobre la letra de abajo, respetando la columna. */
export function mergeChordLine(chordLine: string, lyric: string): string {
  let result = lyric;
  // De derecha a izquierda, para que insertar no corra las columnas que faltan.
  for (const { col: start, chord } of chordColumns(chordLine).reverse()) {
    let col = start;
    // Si el acorde cae sobre un espacio, va con la palabra que sigue.
    while (col < lyric.length && lyric[col] === " ") col++;
    if (col >= result.length) result = result.padEnd(col, " ");
    result = `${result.slice(0, col)}[${chord}]${result.slice(col)}`;
  }
  return result.replace(/\s+$/, "");
}

/** Convierte una hoja con los acordes en la línea de arriba (como en LaCuerda) a ChordPro. */
export function chordSheetToChordPro(text: string): string {
  const lines = text.replace(/\r/g, "").replace(/\t/g, "    ").split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isChordLine(line)) {
      const next = lines[i + 1];
      if (next !== undefined && next.trim() && !isChordLine(next) && !isHeader(next)) {
        out.push(mergeChordLine(line, next));
        i++;
      } else {
        out.push(chordColumns(line).map((c) => `[${c.chord}]`).join(" "));
      }
    } else {
      out.push(line.replace(/\s+$/, ""));
    }
  }
  return out.join("\n");
}

// Texto del editor ↔ secciones

const HEADER_WORDS =
  /^(estrofa|verso|coro|pre-?coro|puente|intro|introducci[oó]n|final|outro|interludio|instrumental|tag|refr[aá]n|verse|chorus|pre-?chorus|bridge|refrain|ending|vamp)\b/i;

/** "Coro", "Coro:", "[Coro]", "Estrofa 2", "{c: Puente}" */
export function isHeader(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 30 || chordsInLine(t).length) return false;
  if (/^\[[^\]]+\]$/.test(t)) return true;
  const bare = t.replace(/^\{c(omment)?:\s*/i, "").replace(/\}$/, "").replace(/^\[|\]$/g, "").replace(/:$/, "");
  return HEADER_WORDS.test(bare) || /^\{c(omment)?:/i.test(t) || (t.endsWith(":") && bare.split(/\s+/).length <= 3);
}

function headerName(line: string): string {
  const t = line.trim().replace(/^\{c(omment)?:\s*/i, "").replace(/\}$/, "").replace(/^\[|\]$/g, "").replace(/:$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Convierte el texto del editor en secciones
export function textToSections(raw: string): Section[] {
  const hasChordPro = /\[[^\]]+\]/.test(raw) && raw.split("\n").some((l) => chordsInLine(l).length);
  const text = hasChordPro ? raw.replace(/\r/g, "") : chordSheetToChordPro(raw);

  const blocks: { name?: string; lines: string[] }[] = [];
  let current: { name?: string; lines: string[] } | null = null;
  for (const line of text.split("\n")) {
    if (!line.trim()) {
      current = null;
      continue;
    }
    if (isHeader(line)) {
      current = { name: headerName(line), lines: [] };
      blocks.push(current);
      continue;
    }
    if (!current) {
      current = { lines: [] };
      blocks.push(current);
    }
    current.lines.push(line.trim());
  }

  const filled = blocks.filter((b) => b.lines.length);
  const key = (b: { lines: string[] }) => b.lines.map(lyricsOf).join("\n").toLowerCase().replace(/\s+/g, " ").trim();
  const counts = new Map<string, number>();
  for (const b of filled) counts.set(key(b), (counts.get(key(b)) ?? 0) + 1);

  let verse = 0;
  return filled.map((b) => {
    if (b.name) return { name: b.name, lines: b.lines };
    const repeated = (counts.get(key(b)) ?? 0) > 1;
    const onlyChords = b.lines.every((l) => !lyricsOf(l).trim());
    const name = onlyChords ? "Instrumental" : repeated ? "Coro" : `Estrofa ${++verse}`;
    return { name, lines: b.lines };
  });
}

export function sectionsToText(sections: Section[]): string {
  return sections.map((s) => `[${s.name}]\n${s.lines.join("\n")}`).join("\n\n");
}
