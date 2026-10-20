import { noteLabel, parseKey, type Notation } from "./music";

/** "G" → "G mayor", "F#m" → "Fa# menor" según la notación. */
export function keyText(key: string, notation: Notation): string {
  const k = parseKey(key);
  return `${noteLabel(k.tonic, notation)} ${k.minor ? "menor" : "mayor"}`;
}
