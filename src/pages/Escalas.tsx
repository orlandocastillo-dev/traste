import { useState } from "react";
import { useAppSelector } from "../app/hooks";
import { Fretboard } from "../components/Fretboard";
import { playSequence } from "../lib/audio";
import { chroma, intervalLabel, noteLabel, scaleName, scaleNotes, SCALE_TYPES, SHARPS } from "../lib/music";
import { patternMidi, scalePatterns } from "../lib/positions";
import { Posiciones } from "../components/Posiciones";

const ABOUT: Record<string, string> = {
  "minor pentatonic": "La escala más usada en solos de rock, blues y pop. Cinco notas, ninguna choca.",
  "major pentatonic": "Alegre y abierta. Country, pop y baladas.",
  blues: "Pentatónica menor con la quinta disminuida como nota de paso.",
  major: "La escala de referencia: do, re, mi, fa, sol, la, si.",
  aeolian: "La menor natural. Melancólica, la base de la tonalidad menor.",
  dorian: "Menor con la sexta mayor: Santana, funk, jazz modal.",
  mixolydian: "Mayor con la séptima bemol: rock clásico y blues alegre.",
  "harmonic minor": "Menor con la séptima mayor: sonido flamenco, clásico y metal neoclásico.",
};

export function Escalas() {
  const notation = useAppSelector((s) => s.prefs.notation);
  const [tonic, setTonic] = useState("A");
  const [type, setType] = useState("minor pentatonic");
  const [positionId, setPositionId] = useState("todo");
  const notes = scaleNotes(tonic, type);
  const patterns = scalePatterns(tonic, type);
  const position = patterns.find((p) => p.id === positionId);

  return (
    <div className="page page--wide">
      <header className="page-head">
        <h1>Escalas en el mástil</h1>
        <p className="muted">Elige la tónica y la escala. Estudia el diapasón por posiciones y escúchala.</p>
      </header>

      <div className="picker" role="group" aria-label="Tónica">
        {SHARPS.map((n) => (
          <button key={n} type="button" className="chip chip--note" aria-pressed={tonic === n} onClick={() => setTonic(n)}>
            {noteLabel(n, notation)}
          </button>
        ))}
      </div>
      <div className="picker" role="group" aria-label="Escala">
        {SCALE_TYPES.map((t) => (
          <button key={t} type="button" className="chip" aria-pressed={type === t} onClick={() => setType(t)}>
            {scaleName(t)}
          </button>
        ))}
      </div>

      <section className="block">
        <h2 className="section-title">
          {scaleName(type)} de {noteLabel(tonic, notation)}
        </h2>
        <p className="muted">{ABOUT[type]}</p>
        <ol className="degrees">
          {notes.map((n) => (
            <li key={n}>
              <span className="degrees__note">{noteLabel(n, notation)}</span>
              <span className="degrees__int">{intervalLabel(chroma(n), chroma(tonic))}</span>
            </li>
          ))}
        </ol>
        <div className="fb-toolbar">
          <Posiciones patterns={patterns} value={positionId} onChange={setPositionId} />
          <button type="button" className="btn" onClick={() => playSequence(patternMidi(position ?? patterns[0]))}>
            ▶ Escuchar
          </button>
        </div>
        <Fretboard notes={notes} tonic={tonic} cells={position?.cells} frets={Math.max(15, position?.range[1] ?? 15)} label={`${scaleName(type)} de ${tonic} en el diapasón`} />
      </section>
    </div>
  );
}
