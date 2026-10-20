import { chroma } from "./music";
import { TUNING } from "./voicings";

/** Posiciones típicas para estudiar una escala por partes en el mástil. */
export const POSITIONS: { id: string; name: string; range: [number, number] | undefined }[] = [
  { id: "todo", name: "Todo el mástil", range: undefined },
  { id: "p1", name: "Trastes 0 a 4", range: [0, 4] },
  { id: "p2", name: "Trastes 3 a 7", range: [3, 7] },
  { id: "p3", name: "Trastes 5 a 9", range: [5, 9] },
  { id: "p4", name: "Trastes 7 a 11", range: [7, 11] },
  { id: "p5", name: "Trastes 10 a 15", range: [10, 15] },
];

/** Notas MIDI de la escala en una posición, ordenadas de grave a agudo, para escucharla. */
export function scaleMidiInRange(notes: string[], range: [number, number] = [0, 4]): number[] {
  const pcs = new Set(notes.map(chroma));
  const out = new Set<number>();
  for (const open of TUNING) {
    for (let f = range[0]; f <= range[1]; f++) if (pcs.has((open + f) % 12)) out.add(open + f);
  }
  return [...out].sort((a, b) => a - b);
}
