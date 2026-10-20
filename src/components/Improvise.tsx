import { useMemo, useState } from "react";
import { useAppSelector } from "../app/hooks";
import { playSequence } from "../lib/audio";
import { keyText } from "../lib/format";
import { chordLabel, chordPitchClasses, noteLabel, scaleName, scaleNotes, suggestScales } from "../lib/music";
import { POSITIONS, scaleMidiInRange } from "../lib/positions";
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
  const position = POSITIONS.find((p) => p.id === positionId) ?? POSITIONS[0];
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
        <label htmlFor="posicion" className="sr-only">
          Posición
        </label>
        <select id="posicion" value={positionId} onChange={(e) => setPositionId(e.target.value)}>
          {POSITIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={() => playSequence(scaleMidiInRange(notes, position.range ?? [0, 4]))}>
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
      <Fretboard notes={notes} tonic={scale.tonic} highlight={highlight} range={position.range} capo={capo} label={`${scale.name} en el diapasón`} />
    </section>
  );
}
