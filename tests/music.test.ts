import { describe, expect, it } from "vitest";
import {
  chordLabel,
  diatonicChords,
  guessKey,
  chordPitchClasses,
  intervalLabel,
  noteLabel,
  parseChord,
  scaleNotes,
  shapeWithCapo,
  suggestScales,
  transposeChord,
  transposeKey,
} from "../src/lib/music";
import { patternMidi, scalePatterns } from "../src/lib/positions";

describe("acordes", () => {
  it("separa fundamental, tipo y bajo", () => {
    expect(parseChord("F#m7")).toEqual({ root: "F#", quality: "m7", bass: undefined });
    expect(parseChord("D/F#")).toEqual({ root: "D", quality: "", bass: "F#" });
    expect(parseChord("hola")).toBeNull();
  });

  it("calcula las notas de un acorde como clases de altura", () => {
    expect(chordPitchClasses("Am")).toEqual([9, 0, 4]);
    expect(chordPitchClasses("G7")).toEqual([7, 11, 2, 5]);
  });
});

describe("transposición", () => {
  it("sube y baja la tonalidad", () => {
    expect(transposeKey("G", 2)).toBe("A");
    expect(transposeKey("Am", -2)).toBe("Gm");
  });

  it("escribe con bemoles en tonalidades de bemoles", () => {
    expect(transposeKey("G", -1)).toBe("Gb");
    expect(transposeChord("C", 1, "Db")).toBe("Db");
    expect(transposeChord("C", 1, "D")).toBe("C#");
  });

  it("transpone también el bajo de un acorde con barra", () => {
    expect(transposeChord("D/F#", 2, "E")).toBe("E/G#");
  });

  it("con cejilla devuelve la forma que se toca", () => {
    // Wonderwall suena en F#m con cejilla 2: se toca con forma de Em.
    expect(shapeWithCapo("F#m", 2, "F#m")).toBe("Em");
    expect(shapeWithCapo("A", 2, "F#m")).toBe("G");
    expect(shapeWithCapo("C", 0, "C")).toBe("C");
  });
});

describe("notación latina", () => {
  it("traduce notas y acordes", () => {
    expect(noteLabel("Bb", "latina")).toBe("Sib");
    expect(chordLabel("F#m7", "latina")).toBe("Fa#m7");
    expect(chordLabel("D/F#", "latina")).toBe("Re/Fa#");
    expect(chordLabel("Am", "americana")).toBe("Am");
  });
});

describe("escalas", () => {
  it("genera la pentatónica menor", () => {
    expect(scaleNotes("A", "minor pentatonic")).toEqual(["A", "C", "D", "E", "G"]);
  });

  it("nombra intervalos respecto a la tónica", () => {
    expect(intervalLabel(0, 0)).toBe("1");
    expect(intervalLabel(3, 0)).toBe("b3");
    expect(intervalLabel(7, 0)).toBe("5");
  });

  it("en tonalidad mayor sugiere la pentatónica mayor y la menor relativa", () => {
    const options = suggestScales("G", ["G", "D", "Em", "C"]);
    expect(options[0]).toMatchObject({ tonic: "G", type: "major pentatonic" });
    expect(options.some((o) => o.tonic === "E" && o.type === "minor pentatonic")).toBe(true);
    for (const o of options) expect(o.why.length).toBeGreaterThan(10);
  });

  it("en menor con V mayor sugiere la menor armónica", () => {
    const withV = suggestScales("Bm", ["Bm", "A", "G", "F#"]);
    expect(withV.map((o) => o.type)).toContain("harmonic minor");
    const withoutV = suggestScales("Em", ["Em", "C", "G", "D"]);
    expect(withoutV.map((o) => o.type)).not.toContain("harmonic minor");
    expect(withoutV[0]).toMatchObject({ tonic: "E", type: "minor pentatonic" });
  });

  it("devuelve las notas de una posición de grave a agudo", () => {
    const midi = patternMidi(scalePatterns("A", "minor pentatonic")[0]);
    expect(midi[0]).toBe(45); // La en la sexta cuerda, traste 5
    expect([...midi].sort((a, b) => a - b)).toEqual(midi);
    expect(new Set(midi.map((n) => n % 12))).toEqual(new Set([9, 0, 2, 4, 7]));
  });
});

describe("tonalidad", () => {
  it("lista los acordes de la tonalidad", () => {
    expect(diatonicChords("G")).toEqual(["G", "Am", "Bm", "C", "D", "Em", "D7"]);
    expect(diatonicChords("F")).toEqual(["F", "Gm", "Am", "Bb", "C", "Dm", "C7"]);
    expect(diatonicChords("Em")).toEqual(["Em", "G", "Am", "Bm", "B", "C", "D"]);
  });

  it("adivina la tonalidad por los acordes", () => {
    expect(guessKey(["G", "D", "Em", "C", "G"])).toBe("G");
    expect(guessKey(["D", "A", "Bm", "G", "D"])).toBe("D");
    expect(guessKey(["Em", "C", "G", "D", "Em"])).toBe("Em");
    expect(guessKey(["F", "Bb", "C7", "F"])).toBe("F");
    expect(guessKey([])).toBeNull();
  });
});
