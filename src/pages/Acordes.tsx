import { useState } from "react";
import { Chord } from "tonal";
import { useAppSelector } from "../app/hooks";
import { ChordDiagram } from "../components/ChordDiagram";
import { Fretboard } from "../components/Fretboard";
import { strum } from "../lib/audio";
import { chordLabel, chroma, intervalLabel, noteLabel, SHARPS } from "../lib/music";
import { midiNotes, voicingFor } from "../lib/voicings";

const QUALITIES: { id: string; name: string }[] = [
  { id: "", name: "Mayor" },
  { id: "m", name: "Menor" },
  { id: "7", name: "Séptima" },
  { id: "m7", name: "Menor séptima" },
  { id: "maj7", name: "Séptima mayor" },
  { id: "sus2", name: "Sus2" },
  { id: "sus4", name: "Sus4" },
  { id: "7sus4", name: "7sus4" },
  { id: "add9", name: "Add9" },
  { id: "6", name: "Sexta" },
  { id: "m6", name: "Menor sexta" },
  { id: "9", name: "Novena" },
  { id: "dim", name: "Disminuido" },
  { id: "m7b5", name: "Semidisminuido" },
  { id: "aug", name: "Aumentado" },
  { id: "5", name: "Quinta (power chord)" },
];

export function Acordes() {
  const notation = useAppSelector((s) => s.prefs.notation);
  const [root, setRoot] = useState("A");
  const [quality, setQuality] = useState("m");
  const symbol = `${root}${quality}`;
  const info = Chord.get(symbol);
  const voicing = voicingFor(symbol);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Diccionario de acordes</h1>
        <p className="muted">Elige la nota y el tipo: ves cómo se toca, qué notas tiene y dónde están en el mástil.</p>
      </header>

      <div className="picker" role="group" aria-label="Nota fundamental">
        {SHARPS.map((n) => (
          <button key={n} type="button" className="chip chip--note" aria-pressed={root === n} onClick={() => setRoot(n)}>
            {noteLabel(n, notation)}
          </button>
        ))}
      </div>
      <div className="picker" role="group" aria-label="Tipo de acorde">
        {QUALITIES.map((q) => (
          <button key={q.id} type="button" className="chip" aria-pressed={quality === q.id} onClick={() => setQuality(q.id)}>
            {q.name}
          </button>
        ))}
      </div>

      <section className="chord-detail">
        <ChordDiagram shape={symbol} size="lg" />
        <div className="chord-detail__info">
          <h2 className="chord-detail__name">{chordLabel(symbol, notation)}</h2>
          <dl className="facts">
            <div>
              <dt>Notas</dt>
              <dd>{info.notes.map((n) => noteLabel(n, notation)).join(" · ")}</dd>
            </div>
            <div>
              <dt>Intervalos</dt>
              <dd>{info.notes.map((n) => intervalLabel(chroma(n), chroma(root))).join(" · ") || "—"}</dd>
            </div>
          </dl>
          <button type="button" className="btn btn--primary" disabled={!voicing} onClick={() => voicing && strum(midiNotes(voicing.frets))}>
            ▶ Escuchar
          </button>
          {voicing?.simplified && <p className="muted small">Se muestra una versión simplificada.</p>}
        </div>
      </section>

      <section className="block" aria-labelledby="en-mastil">
        <h2 id="en-mastil" className="section-title">
          Las notas de {chordLabel(symbol, notation)} en todo el mástil
        </h2>
        <Fretboard notes={info.notes} tonic={root} label={`Notas del acorde ${symbol} en el diapasón`} />
      </section>
    </div>
  );
}
