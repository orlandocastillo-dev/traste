import { describe, expect, it } from "vitest";
import { chordPitchClasses } from "../src/lib/music";
import { baseFret, midiNotes, TUNING, voicingFor } from "../src/lib/voicings";

const SAMPLE = ["C", "G", "Am", "F", "Bm", "F#m", "Bb", "C#m7", "E7", "Cadd9", "B7", "Ebmaj7", "Gsus4", "Am7b5", "Gdim"];

describe("posiciones de acordes", () => {
  it("usa las formas abiertas conocidas", () => {
    expect(voicingFor("C")?.frets).toEqual([-1, 3, 2, 0, 1, 0]);
    expect(voicingFor("G")?.frets).toEqual([3, 2, 0, 0, 0, 3]);
    expect(voicingFor("E7")?.frets).toEqual([0, 2, 0, 1, 0, 0]);
  });

  it("arma cejillas móviles para lo que no tiene forma abierta", () => {
    expect(voicingFor("F#m")).toEqual({ frets: [2, 4, 4, 2, 2, 2], barre: 2 });
    expect(voicingFor("Bb")).toEqual({ frets: [-1, 1, 3, 3, 3, 1], barre: 1 });
  });

  it.each(SAMPLE)("%s solo tiene notas del acorde", (symbol) => {
    const v = voicingFor(symbol);
    expect(v).not.toBeNull();
    const allowed = new Set(chordPitchClasses(symbol));
    for (const midi of midiNotes(v!.frets)) expect(allowed.has(midi % 12)).toBe(true);
  });

  it("pone el bajo correcto en acordes con barra", () => {
    const v = voicingFor("D/F#")!;
    expect(Math.min(...midiNotes(v.frets)) % 12).toBe(6);
  });

  it("acepta enharmónicos", () => {
    expect(voicingFor("Gb")?.frets).toEqual(voicingFor("F#")?.frets);
  });

  it("devuelve null si no entiende el acorde", () => {
    expect(voicingFor("Xyz")).toBeNull();
  });

  it("la cejilla sube todas las notas", () => {
    const open = voicingFor("Em")!.frets;
    expect(midiNotes(open, 2)).toEqual(midiNotes(open).map((n) => n + 2));
    expect(midiNotes(open)[0]).toBe(TUNING[0]);
  });

  it("calcula el traste inicial del diagrama", () => {
    expect(baseFret([-1, 3, 2, 0, 1, 0])).toBe(1);
    expect(baseFret([-1, 4, 6, 4, 5, 4])).toBe(4);
  });
});
