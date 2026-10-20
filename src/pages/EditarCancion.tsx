import { useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { songDeleted, songSaved } from "../features/library/librarySlice";
import { chordAtWord, chordsInLine, lineToWords, readChord, sectionsToText, setChordAtWord, textToSections } from "../lib/chordpro";
import { keyText } from "../lib/format";
import { chordLabel, diatonicChords, guessKey, SHARPS } from "../lib/music";
import { parseYouTubeId, watchUrl } from "../lib/youtube";
import type { Song } from "../types";
import type { ImportDraft } from "./VideoImport";

const KEYS = [...SHARPS, ...SHARPS.map((n) => `${n}m`)];

function slug(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "cancion"
  );
}

/** Español o inglés según las palabras más comunes de la letra. */
function guessLang(text: string): "es" | "en" {
  const w = text.toLowerCase().split(/[^a-záéíóúñ']+/);
  const es = w.filter((x) => ["que", "de", "el", "la", "y", "tu", "mi", "es", "en", "señor", "dios"].includes(x)).length;
  const en = w.filter((x) => ["the", "and", "you", "my", "is", "of", "to", "lord", "god", "i"].includes(x)).length;
  return en > es ? "en" : "es";
}

export function EditarCancion() {
  const { id } = useParams();
  const draft = (useLocation().state ?? null) as ImportDraft | null;
  const existing = useAppSelector((s) => (id ? s.library.entities[id] : undefined));
  const notation = useAppSelector((s) => s.prefs.notation);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [title, setTitle] = useState(existing?.title ?? draft?.title ?? "");
  const [artist, setArtist] = useState(existing?.artist ?? draft?.artist ?? "");
  const [key, setKey] = useState(existing?.key ?? "auto");
  const [capo, setCapo] = useState(existing?.capo ?? 0);
  const [video, setVideo] = useState(existing?.youtubeId ? watchUrl(existing.youtubeId) : draft?.youtubeId ? watchUrl(draft.youtubeId) : "");
  const [text, setText] = useState(existing ? sectionsToText(existing.sections) : (draft?.lyrics ?? ""));
  const [mode, setMode] = useState<"texto" | "acordes">(draft?.lyrics ? "acordes" : "texto");
  const [brush, setBrush] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sections = useMemo(() => textToSections(text), [text]);
  const chords = useMemo(() => [...new Set(sections.flatMap((s) => s.lines.flatMap(chordsInLine)))], [sections]);
  const detected = guessKey(chords);
  const effectiveKey = key === "auto" ? (detected ?? "G") : key;
  const palette = [...new Set([...diatonicChords(effectiveKey), ...chords])];
  const brushChord = brush ?? palette[0];

  const placeChord = (si: number, li: number, wi: number) => {
    const line = sections[si].lines[li];
    const current = chordAtWord(line, wi);
    // Tocar una palabra que ya tiene ese mismo acorde lo quita; con el borrador activo, siempre lo quita.
    const next = brush === "" || current === brushChord ? null : brushChord;
    const updated = sections.map((s, i) =>
      i !== si ? s : { ...s, lines: s.lines.map((l, j) => (j === li ? setChordAtWord(l, wi, next) : l)) },
    );
    setText(sectionsToText(updated));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) return setError("Escribe el nombre de la canción.");
    if (!sections.length) return setError("Falta la letra. Pégala o escríbela en el cuadro.");
    const youtubeId = video.trim() ? parseYouTubeId(video) : null;
    if (video.trim() && !youtubeId) return setError("El link de YouTube no es válido. Cópialo de nuevo desde el video.");

    const song: Song = {
      id: existing?.id ?? `mia-${slug(title)}-${Date.now().toString(36)}`,
      title: title.trim(),
      artist: artist.trim() || "Sin artista",
      key: effectiveKey,
      lang: guessLang(sections.flatMap((s) => s.lines).join(" ")),
      capo: capo || undefined,
      youtubeId: youtubeId ?? undefined,
      sections,
      custom: true,
    };
    dispatch(songSaved(song));
    navigate(`/cancion/${song.id}`, { replace: true });
  };

  return (
    <div className="page page--narrow">
      <header className="page-head">
        <h1>{existing ? "Editar canción" : "Nueva canción"}</h1>
      </header>

      <form className="form" onSubmit={submit} noValidate>
        <div className="field-row">
          <div className="field">
            <label htmlFor="titulo">Canción</label>
            <input id="titulo" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="artista">Artista</label>
            <input id="artista" value={artist} onChange={(e) => setArtist(e.target.value)} />
          </div>
        </div>
        <div className="field-row field-row--3">
          <div className="field">
            <label htmlFor="tono">Tonalidad</label>
            <select id="tono" value={key} onChange={(e) => setKey(e.target.value)}>
              <option value="auto">{detected ? `Detectada: ${keyText(detected, notation)}` : "Detectar con los acordes"}</option>
              {KEYS.map((k) => (
                <option key={k} value={k}>
                  {keyText(k, notation)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="capo-n">Cejilla</label>
            <select id="capo-n" value={capo} onChange={(e) => setCapo(Number(e.target.value))}>
              <option value={0}>No</option>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Traste {n}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="video">Link de YouTube</label>
            <input id="video" value={video} onChange={(e) => setVideo(e.target.value)} placeholder="Opcional" inputMode="url" />
          </div>
        </div>

        <div className="editor">
          <div className="editor__head">
            <div className="segmented" role="group" aria-label="Forma de editar">
              <button type="button" aria-pressed={mode === "texto"} onClick={() => setMode("texto")}>
                Letra
              </button>
              <button type="button" aria-pressed={mode === "acordes"} onClick={() => setMode("acordes")} disabled={!sections.length}>
                Colocar acordes
              </button>
            </div>
          </div>

          {mode === "texto" ? (
            <>
              <label htmlFor="letra" className="sr-only">
                Letra y acordes
              </label>
              <textarea
                id="letra"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={16}
                spellCheck={false}
                placeholder={"Pega aquí la letra.\n\nSi la copias de un cancionero con los acordes en la línea de arriba,\nse acomodan solos sobre la palabra que corresponde.\n\nSepara las estrofas con una línea en blanco."}
              />
              <p className="muted small">
                También entiende acordes entre corchetes (A[G]mazing [C]grace) y cifrado latino (Do, Rem, Sol7). Para nombrar una parte escribe
                [Coro] o [Puente] en su propia línea.
              </p>
            </>
          ) : (
            <>
              <div className="palette" role="radiogroup" aria-label="Acorde a colocar">
                {palette.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={brushChord === c && brush !== ""} onClick={() => setBrush(c)}>
                    {chordLabel(c, notation)}
                  </button>
                ))}
                <input
                  aria-label="Otro acorde"
                  placeholder="Otro"
                  value={custom}
                  onChange={(e) => {
                    setCustom(e.target.value);
                    const c = readChord(e.target.value);
                    if (c) setBrush(c);
                  }}
                />
                <button type="button" role="radio" aria-checked={brush === ""} onClick={() => setBrush("")} className="palette__erase">
                  Borrar
                </button>
              </div>
              <p className="muted small">
                {brush === ""
                  ? "Toca un acorde de la letra para quitarlo."
                  : `Toca la palabra donde entra ${chordLabel(brushChord, notation)}. Los acordes de arriba son los de ${keyText(effectiveKey, notation)}.`}
              </p>
              <div className="sheet sheet--edit">
                {sections.map((s, si) => (
                  <section key={si} className="sheet__section">
                    <h3 className="sheet__name">{s.name}</h3>
                    {s.lines.map((line, li) => (
                      <p key={li} className="sheet__line">
                        {lineToWords(line).map((word, wi) => (
                          <button type="button" key={wi} className="w w--tap" onClick={() => placeChord(si, li, wi)}>
                            {word.map((piece, m) => (
                              <span key={m} className="p">
                                {piece.chord !== undefined && <span className="c">{chordLabel(piece.chord, notation)}</span>}
                                <span className="t">{piece.text || " "}</span>
                              </span>
                            ))}
                          </button>
                        ))}
                      </p>
                    ))}
                  </section>
                ))}
              </div>
            </>
          )}
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {existing && (
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() => {
                dispatch(songDeleted(existing.id));
                navigate("/", { replace: true });
              }}
            >
              Eliminar canción
            </button>
          )}
          <span className="spacer" />
          <button type="submit" className="btn btn--ink">
            Guardar canción
          </button>
        </div>
      </form>
    </div>
  );
}
