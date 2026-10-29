import { chroma, scaleNotes } from "./music";
import { TUNING } from "./voicings";

/** Una casilla del mástil: cuerda (índice en TUNING, 0 = sexta) y traste. */
export interface Cell {
  s: number;
  f: number;
}

export interface Pattern {
  id: string;
  name: string;
  cells: Cell[];
  range: [number, number];
}

const ULTIMO_TRASTE = 15;

/**
 * Las posiciones de verdad de una escala, calculadas desde su tónica.
 * Pentatónicas: las cinco cajas de dos notas por cuerda. Escalas de siete notas: tres notas por cuerda.
 * Blues: la caja de la pentatónica menor con la nota de blues donde cae.
 */
export function scalePatterns(tonic: string, type: string): Pattern[] {
  const blues = type === "blues";
  const base = scaleNotes(tonic, blues ? "minor pentatonic" : type).map(chroma);
  const extra = blues ? (chroma(tonic) + 6) % 12 : null;
  if (base.length !== 5 && base.length !== 7) return [];
  const porCuerda = base.length === 5 ? 2 : 3;
  const enEscala = new Set(base);

  return base.map((grado, k) => {
    // Arranca en la sexta cuerda con el grado k y sube nota por nota de la escala.
    let pitch = TUNING[0] + ((grado - TUNING[0]) % 12 + 12) % 12;
    const cells: Cell[] = [];
    for (let s = 0; s < 6; s++) {
      for (let n = 0; n < porCuerda; n++) {
        cells.push({ s, f: pitch - TUNING[s] });
        do pitch++;
        while (!enEscala.has(pitch % 12));
      }
    }
    let min = Math.min(...cells.map((c) => c.f));
    let max = Math.max(...cells.map((c) => c.f));
    // Que quepa en el mástil que se dibuja: si se sale por arriba, una octava más abajo.
    const corrimiento = min < 0 ? 12 : max > ULTIMO_TRASTE && min >= 12 ? -12 : 0;
    for (const c of cells) c.f += corrimiento;
    min += corrimiento;
    max += corrimiento;
    if (extra !== null) {
      for (let s = 0; s < 6; s++) {
        for (let f = min; f <= max; f++) if ((TUNING[s] + f) % 12 === extra) cells.push({ s, f });
      }
    }
    return { id: `p${k + 1}`, name: `Posición ${k + 1} (trastes ${min} a ${max})`, cells, range: [min, max] };
  });
}

/** Notas MIDI de una posición, de grave a agudo, para escucharla. */
export function patternMidi(p: Pattern): number[] {
  return [...new Set(p.cells.map((c) => TUNING[c.s] + c.f))].sort((a, b) => a - b);
}
