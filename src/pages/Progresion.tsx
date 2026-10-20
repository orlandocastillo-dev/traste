import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAppSelector } from "../app/hooks";
import { ChordDiagram } from "../components/ChordDiagram";
import { Improvise } from "../components/Improvise";
import { strum } from "../lib/audio";
import { keyText } from "../lib/format";
import { capoSuggestion, parseProgression } from "../lib/progression";
import { chordLabel, isInKey, rankKeys, romanNumeral, shapeWithCapo, transposeChord, transposeKey } from "../lib/music";
import { midiNotes, voicingFor } from "../lib/voicings";
import type { ImportDraft } from "./VideoImport";

const EXAMPLES = ["G D Em C", "D A/C# Bm G", "Am F C G", "Do Sol Lam Fa", "E B C#m A", "Bm G D A"];

export function Progresion() {
  const notation = useAppSelector((s) => s.prefs.notation);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(() => params.get("acordes")?.replace(/-/g, " ") ?? "");
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  const { chords, invalid } = useMemo(() => parseProgression(text), [text]);
  const ranking = useMemo(() => rankKeys(chords), [chords]);
  const best = ranking[0];
  // Otras lecturas razonables: casi siempre la relativa (G mayor o E menor).
  const alternatives = best ? ranking.slice(1).filter((r) => r.inKey === best.inKey).slice(0, 2) : [];
  const key = chosenKey && ranking.some((r) => r.key === chosenKey) ? chosenKey : best?.key;
  const fit = ranking.find((r) => r.key === key);
  const capo = key ? capoSuggestion(key) : null;

  // La progresión queda en la dirección para poder compartirla o volver a ella.
  useEffect(() => {
    const value = chords.join("-");
    if ((params.get("acordes") ?? "") !== value) setParams(value ? { acordes: value } : {}, { replace: true });
  }, [chords, params, setParams]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const play = () => {
    timers.current.forEach(clearTimeout);
    timers.current = chords.map((c, i) =>
      window.setTimeout(() => {
        setActiveIndex(i);
        const v = voicingFor(c);
        if (v) strum(midiNotes(v.frets));
      }, i * 1100),
    );
    timers.current.push(window.setTimeout(() => setActiveIndex(null), chords.length * 1100));
  };

  const transposeAll = (semis: number) => {
    if (!key) return;
    const target = transposeKey(key, semis);
    setText(chords.map((c) => transposeChord(c, semis, target)).join(" "));
    setChosenKey(target);
  };

  const saveAsSong = () => {
    const state: ImportDraft = { title: "", artist: "", youtubeId: "", lyrics: `[Progresión]\n${chords.map((c) => `[${c}]`).join(" ")}` };
    navigate("/nueva", { state });
  };

  const activeChord = activeIndex !== null ? chords[activeIndex] : null;

  return (
    <div className="page page--wide">
      <header className="page-head">
        <h1>¿En qué tono está?</h1>
        <p>Escribe los acordes en el orden en que los tocas. Te digo la tonalidad, el grado de cada acorde y qué escalas usar para el solo.</p>
      </header>

      <div className="finder">
        <label htmlFor="progresion" className="sr-only">
          Acordes de la progresión
        </label>
        <div className="finder__row">
          <input
            id="progresion"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setChosenKey(null);
            }}
            placeholder="G  D  Em  C"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="finder__chords"
          />
        </div>
        <p className="finder__hint">
          Ejemplos:{" "}
          {EXAMPLES.map((ex, i) => (
            <span key={ex}>
              {i > 0 && ", "}
              <button
                type="button"
                className="link link--plain"
                onClick={() => {
                  setText(ex);
                  setChosenKey(null);
                }}
              >
                {ex}
              </button>
            </span>
          ))}
          .
        </p>
        {invalid.length > 0 && (
          <p className="form-error" role="status">
            No reconozco {invalid.map((t) => `“${t}”`).join(", ")} como {invalid.length === 1 ? "acorde" : "acordes"}.
          </p>
        )}
      </div>

      {key && fit && (
        <>
          <section className="analysis" aria-live="polite">
            <p className="analysis__key">{keyText(key, notation)}</p>
            <p className="muted">
              {fit.inKey === fit.total
                ? `Los ${fit.total} acordes pertenecen a ${keyText(key, notation)}.`
                : `${fit.inKey} de ${fit.total} acordes pertenecen a ${keyText(key, notation)}; los demás están marcados como prestados.`}
              {capo && ` Con cejilla en el traste ${capo.capo} la tocas con formas de ${keyText(capo.shapes, notation)}.`}
            </p>
            {alternatives.length > 0 && (
              <div className="tabs" role="group" aria-label="Otras tonalidades posibles">
                {[best, ...alternatives].map((r) => (
                  <button key={r.key} type="button" aria-pressed={r.key === key} onClick={() => setChosenKey(r.key)}>
                    {keyText(r.key, notation)}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section aria-label="Progresión" className="progression">
            {chords.map((c, i) => (
              <div key={i} className={`progression__item ${isInKey(c, key) ? "" : "is-borrowed"}`}>
                <ChordDiagram shape={c} active={activeIndex === i} onPlay={() => setActiveIndex(i)} />
                <span className="progression__degree">{romanNumeral(c, key)}</span>
                {!isInKey(c, key) && <span className="progression__note">prestado</span>}
              </div>
            ))}
          </section>

          <div className="fb-tools">
            <button type="button" className="btn btn--ink" onClick={play}>
              Escuchar la progresión
            </button>
            <div className="stepper" role="group" aria-label="Transponer">
              <button type="button" onClick={() => transposeAll(-1)} aria-label="Bajar medio tono">
                −
              </button>
              <output>Transponer</output>
              <button type="button" onClick={() => transposeAll(1)} aria-label="Subir medio tono">
                +
              </button>
            </div>
            <button type="button" className="link" onClick={saveAsSong}>
              Guardar como canción
            </button>
          </div>
          {capo && (
            <p className="muted small">
              Formas con cejilla en el {capo.capo}: {chords.map((c) => chordLabel(shapeWithCapo(c, capo.capo, key), notation)).join("  ")}
            </p>
          )}

          <Improvise key={key} songKey={key} chords={chords} activeChord={activeChord} title={`Para el solo en ${keyText(key, notation)}`} />
        </>
      )}
    </div>
  );
}
