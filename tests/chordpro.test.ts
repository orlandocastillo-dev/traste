import { describe, expect, it } from "vitest";
import {
  chordAtWord,
  chordSheetToChordPro,
  chordsInLine,
  isChordLine,
  latinToAmerican,
  lineToWords,
  parsePieces,
  sectionsToText,
  setChordAtWord,
  textToSections,
  transposeLine,
} from "../src/lib/chordpro";

describe("ChordPro", () => {
  it("separa la línea en trozos con su acorde", () => {
    expect(parsePieces("A[G]mazing [G7]grace")).toEqual([
      { text: "A" },
      { chord: "G", text: "mazing " },
      { chord: "G7", text: "grace" },
    ]);
  });

  it("agrupa por palabras sin partir una palabra con acorde en medio", () => {
    const words = lineToWords("gra[C]cia de [G]Dios");
    expect(words).toHaveLength(3);
    expect(words[0]).toEqual([{ text: "gra" }, { chord: "C", text: "cia" }]);
  });

  it("no confunde encabezados entre corchetes con acordes", () => {
    expect(chordsInLine("[Coro]")).toEqual([]);
    expect(chordsInLine("[G]Santo [Am7]eres [D/F#]tú")).toEqual(["G", "Am7", "D/F#"]);
  });

  it("transpone solo los acordes", () => {
    expect(transposeLine("[G]Santo [Em]eres", 2, "A")).toBe("[A]Santo [F#m]eres");
  });

  it("pone, cambia y quita el acorde de una palabra", () => {
    let line = "Nearer, my God, to Thee";
    line = setChordAtWord(line, 0, "G");
    line = setChordAtWord(line, 2, "C");
    expect(line).toBe("[G]Nearer, my [C]God, to Thee");
    expect(chordAtWord(line, 2)).toBe("C");
    line = setChordAtWord(line, 2, "D");
    expect(line).toBe("[G]Nearer, my [D]God, to Thee");
    expect(setChordAtWord(line, 0, null)).toBe("Nearer, my [D]God, to Thee");
  });
});

describe("cifrado latino", () => {
  it("convierte a americano", () => {
    expect(latinToAmerican("Rem7")).toBe("Dm7");
    expect(latinToAmerican("Sol/Si")).toBe("G/B");
    expect(latinToAmerican("Fa#m")).toBe("F#m");
    expect(latinToAmerican("Sib")).toBe("Bb");
  });

  it("no toma palabras como acordes", () => {
    expect(latinToAmerican("Señor")).toBeNull();
    expect(latinToAmerican("Mira")).toBeNull();
    expect(latinToAmerican("Dios")).toBeNull();
  });
});

describe("hojas con acordes encima", () => {
  it("reconoce una línea de acordes", () => {
    expect(isChordLine("G    D/F#   Em  C")).toBe(true);
    expect(isChordLine("Do   Sol   Lam  | x2")).toBe(true);
    expect(isChordLine("Amén, Dios es fiel")).toBe(false);
    expect(isChordLine("A Dios sea la gloria")).toBe(false);
  });

  it("pone cada acorde sobre la sílaba de su columna", () => {
    const sheet = "G        D        Em\nCuán grande es tu amor";
    expect(chordSheetToChordPro(sheet)).toBe("[G]Cuán gran[D]de es tu [Em]amor");
  });

  it("deja los acordes sueltos como pasaje instrumental", () => {
    expect(chordSheetToChordPro("Intro:\nG  D  Em  C\n\nG\nSanto")).toBe("Intro:\n[G] [D] [Em] [C]\n\n[G]Santo");
  });
});

describe("secciones", () => {
  it("nombra estrofas y reconoce el coro porque se repite", () => {
    const text = "Primera estrofa\nlínea\n\nEl coro\nse repite\n\nSegunda estrofa\n\nEl coro\nse repite";
    expect(textToSections(text).map((s) => s.name)).toEqual(["Estrofa 1", "Coro", "Estrofa 2", "Coro"]);
  });

  it("respeta los encabezados escritos", () => {
    const text = "[Intro]\n[G] [D]\n\nCoro:\n[C]Santo\n\nPuente\n[Em]Tú eres";
    expect(textToSections(text)).toEqual([
      { name: "Intro", lines: ["[G] [D]"] },
      { name: "Coro", lines: ["[C]Santo"] },
      { name: "Puente", lines: ["[Em]Tú eres"] },
    ]);
  });

  it("ida y vuelta entre texto y secciones", () => {
    const sections = [
      { name: "Única", lines: ["[G]Praise God, from [D]whom"] },
      { name: "Ambiente", lines: ["[D] [A/C#] [Bm]"] },
    ];
    expect(textToSections(sectionsToText(sections))).toEqual(sections);
  });
});
