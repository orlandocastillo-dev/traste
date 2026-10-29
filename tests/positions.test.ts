import { describe, expect, it } from "vitest";
import { patternMidi, scalePatterns } from "../src/lib/positions";
import { SHARPS } from "../src/lib/music";

const porCuerda = (cells: { s: number; f: number }[]) => [0, 1, 2, 3, 4, 5].map((s) => cells.filter((c) => c.s === s).map((c) => c.f));

describe("posiciones de las escalas", () => {
  it("la caja 1 de la pentatónica menor de La es la de siempre, en el traste 5", () => {
    const [caja] = scalePatterns("A", "minor pentatonic");
    expect(caja.range).toEqual([5, 8]);
    // De la sexta a la primera cuerda
    expect(porCuerda(caja.cells)).toEqual([[5, 8], [5, 7], [5, 7], [5, 7], [5, 8], [5, 8]]);
  });

  it("la de Mi menor arranca al aire", () => {
    expect(scalePatterns("E", "minor pentatonic")[0].range).toEqual([0, 3]);
  });

  it("las pentatónicas tienen cinco cajas de dos notas por cuerda en cualquier tónica", () => {
    for (const t of SHARPS) {
      for (const tipo of ["minor pentatonic", "major pentatonic"]) {
        const cajas = scalePatterns(t, tipo);
        expect(cajas).toHaveLength(5);
        for (const c of cajas) {
          expect(porCuerda(c.cells).every((cuerda) => cuerda.length === 2)).toBe(true);
          expect(c.range[0]).toBeGreaterThanOrEqual(0);
          // Cada caja ocupa a lo sumo cinco trastes, como se toca con una mano quieta
          expect(c.range[1] - c.range[0]).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it("las escalas de siete notas van de a tres por cuerda", () => {
    const pos = scalePatterns("C", "major");
    expect(pos).toHaveLength(7);
    expect(porCuerda(pos[0].cells).every((cuerda) => cuerda.length === 3)).toBe(true);
  });

  it("el blues es la caja menor más la quinta disminuida", () => {
    const [caja] = scalePatterns("A", "blues");
    // Re# (quinta disminuida de La) cae en la quinta cuerda, traste 6
    expect(caja.cells).toContainEqual({ s: 1, f: 6 });
  });

  it("al escucharla suena de grave a agudo sin repetir", () => {
    const midi = patternMidi(scalePatterns("A", "minor pentatonic")[0]);
    expect(midi).toEqual([...midi].sort((a, b) => a - b));
    expect(new Set(midi).size).toBe(midi.length);
  });
});
