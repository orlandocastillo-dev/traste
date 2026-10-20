import { useAppSelector } from "../app/hooks";
import { lineToWords, lyricsOf } from "../lib/chordpro";
import { chordLabel } from "../lib/music";
import type { Section } from "../types";

interface Props {
  sections: Section[];
  /** Convierte el acorde que suena en la forma que se toca (cejilla). */
  shape?: (chord: string) => string;
  activeChord?: string | null;
  onChord?: (chord: string) => void;
}

/** La hoja de la canción: letra con el acorde encima de la sílaba donde cambia. */
export function Sheet({ sections, shape = (c) => c, activeChord, onChord }: Props) {
  const { notation, lyricSize, sheetView } = useAppSelector((s) => s.prefs);
  const showChords = sheetView === "acordes";

  return (
    <div className={`sheet ${showChords ? "" : "sheet--lyrics"}`} style={{ "--lyric-size": `${lyricSize}px` } as React.CSSProperties}>
      {sections.map((section, i) => {
        const onlyChords = section.lines.every((l) => !lyricsOf(l).trim());
        if (!showChords && onlyChords) return null;
        return (
          <section key={i} className="sheet__section">
            <h3 className="sheet__name">{section.name}</h3>
            {section.lines.map((line, j) =>
              showChords ? (
                <p key={j} className={`sheet__line ${lyricsOf(line).trim() ? "" : "sheet__line--chords"}`}>
                  {lineToWords(line).map((word, k) => (
                    <span key={k} className="w">
                      {word.map((piece, m) => (
                        <span key={m} className="p">
                          {piece.chord !== undefined && (
                            <button
                              type="button"
                              className={`c ${activeChord === piece.chord ? "is-on" : ""}`}
                              onClick={() => onChord?.(piece.chord!)}
                            >
                              {chordLabel(shape(piece.chord), notation)}
                            </button>
                          )}
                          <span className="t">{piece.text || " "}</span>
                        </span>
                      ))}
                    </span>
                  ))}
                </p>
              ) : (
                <p key={j} className="sheet__line">
                  {lyricsOf(line).replace(/\s+/g, " ").trim()}
                </p>
              ),
            )}
          </section>
        );
      })}
    </div>
  );
}
