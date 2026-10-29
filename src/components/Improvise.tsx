import { useMemo, useState } from "react";
import { useAppSelector } from "../app/hooks";
import { playSequence } from "../lib/audio";
import { keyText } from "../lib/format";
import { chordLabel, chordPitchClasses, noteLabel, scaleName, scaleNotes, suggestScales } from "../lib/music";
import { patternMidi, scalePatterns } from "../lib/positions";
import { Posiciones } from "./Posiciones";
import { Fretboard } from "./Fretboard";

interface Props {
  songKey: string;
  chords: string[];
  /** El acorde que se acaba de tocar: sus notas se marcan dentro de la escala. */
  activeChord?: string | null;
  capo?: number;
  title?: string;
}

/** Escalas sugeridas para la tonalidad, con el diapasón por posiciones. */
export function Improvise({ songKey, chords, activeChord, capo = 0, title }: Props) {
  const notation = useAppSelector((s) => s.prefs.notation);
  const scales = useMemo(() => suggestScales(songKey, chords), [songKey, chords]);
  const [scaleId, setScaleId] = useState<string | null>(null);
  const [positionId, setPositionId] = useState("todo");

  const scale = scales.find((s) => s.id === scaleId) ?? scales[0];
  const notes = scaleNotes(scale.tonic, scale.type);
  const patterns = scalePatterns(scale.tonic, scale.type);
  const position = patterns.find((p) => p.id === positionId);
  const highlight = activeChord ? chordPitchClasses(activeChord) : [];

  return (
    <section className="improv" aria-labelledby="improvisar">
      <h2 id="improvisar">{title ?? `Para improvisar en ${keyText(songKey, notation)}`}</h2>
      <div className="scales" role="radiogroup" aria-label="Escala">
        {scales.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={scale.id === s.id} className="scale" onClick={() => setScaleId(s.id)}>
            <span className="scale__name">
              {scaleName(s.type)} de {noteLabel(s.tonic, notation)}
            </span>
            <span className="scale__why">{s.why}</span>
          </button>
        ))}
      </div>

      <div className="fb-tools">
        <Posiciones patterns={patterns} value={positionId} onChange={setPositionId} />
        <button type="button" className="btn" onClick={() => playSequence(patternMidi(position ?? patterns[0]))}>
          Escuchar la escala
        </button>
        <p className="legend">
          <span className="legend__dot legend__dot--tonic" /> tónica
          {activeChord && (
            <>
              <span className="legend__dot legend__dot--chord" /> notas de {chordLabel(activeChord, notation)}
            </>
          )}
        </p>
      </div>
      <Fretboard notes={notes} tonic={scale.tonic} highlight={highlight} cells={position?.cells} frets={Math.max(15, position?.range[1] ?? 15)} capo={capo} label={`${scale.name} en el diapasón`} />
    </section>
  );
}
