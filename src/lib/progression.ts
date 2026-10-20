import { readChord } from "./chordpro";
import { transposeKey } from "./music";

/** Tonalidades que se tocan cómodas con formas abiertas. */
const OPEN_KEYS = new Set(["C", "G", "D", "A", "E", "Am", "Em", "Dm"]);

/** "G - D | Em, C" → acordes válidos y lo que no se entendió. */
export function parseProgression(text: string): { chords: string[]; invalid: string[] } {
  const tokens = text.split(/[\s|,;]+|\s-\s/).filter(Boolean);
  const chords: string[] = [];
  const invalid: string[] = [];
  for (const t of tokens) {
    const c = readChord(t);
    if (c) chords.push(c);
    else if (!/^(-|x\d+|\(|\))$/i.test(t)) invalid.push(t);
  }
  return { chords, invalid };
}

/** Con qué cejilla se toca la tonalidad usando formas abiertas, si no es ya una tonalidad cómoda. */
export function capoSuggestion(key: string): { capo: number; shapes: string } | null {
  if (OPEN_KEYS.has(key)) return null;
  for (let capo = 1; capo <= 7; capo++) {
    const shapes = transposeKey(key, -capo);
    if (OPEN_KEYS.has(shapes)) return { capo, shapes };
  }
  return null;
}

