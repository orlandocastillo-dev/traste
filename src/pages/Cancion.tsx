import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { ChordDiagram } from "../components/ChordDiagram";
import { Improvise } from "../components/Improvise";
import { Sheet } from "../components/Sheet";
import { Video } from "../components/Video";
import { useGetCatalogQuery } from "../features/catalog/catalogApi";
import { capoSet, favoriteToggled, settingsReset, songOpened, transposed } from "../features/library/librarySlice";
import { selectAllSongs, transposeSong, uniqueChords } from "../features/library/selectors";
import { LYRIC_SIZES, prefsUpdated } from "../features/prefs/prefsSlice";
import { strum } from "../lib/audio";
import { keyText } from "../lib/format";
import { shapeWithCapo, transposeKey } from "../lib/music";
import { useAutoScroll } from "../lib/useAutoScroll";
import { midiNotes, voicingFor } from "../lib/voicings";

export function Cancion() {
  const { id = "" } = useParams();
  const dispatch = useAppDispatch();
  const { isLoading } = useGetCatalogQuery();
  const songs = useAppSelector(selectAllSongs);
  const original = songs.find((s) => s.id === id);
  const stored = useAppSelector((s) => s.library.settings[id]);
  const isFavorite = useAppSelector((s) => s.library.favorites.includes(id));
  const { notation, lyricSize, sheetView } = useAppSelector((s) => s.prefs);
  const transpose = stored?.transpose ?? 0;
  const capo = stored?.capo ?? original?.capo ?? 0;
  const scroll = useAutoScroll();

  const [activeChord, setActiveChord] = useState<string | null>(null);

  useEffect(() => {
    if (original) dispatch(songOpened(original.id));
  }, [dispatch, original]);

  const song = useMemo(() => (original ? transposeSong(original, transpose) : null), [original, transpose]);
  const chords = useMemo(() => (song ? uniqueChords(song) : []), [song]);

  if (!original || !song) {
    return (
      <div className="page">
        {isLoading ? (
          <p className="muted">Cargando…</p>
        ) : (
          <div className="empty">
            <p>Esta canción no está en tu biblioteca.</p>
            <Link to="/" className="btn">
              Ver canciones
            </Link>
          </div>
        )}
      </div>
    );
  }

  const shape = (c: string) => shapeWithCapo(c, capo, song.key);
  const changed = transpose !== 0 || capo !== (original.capo ?? 0);

  const playChord = (c: string) => {
    setActiveChord(c);
    const v = voicingFor(shape(c));
    if (v) strum(midiNotes(v.frets, capo));
  };

  return (
    <article className="song-page">
      <header className="song-head">
        <Link to="/" className="back">
          Canciones
        </Link>
        <h1>{song.title}</h1>
        <p className="song-head__by">
          {song.artist}
          {song.year ? `, ${song.year}` : ""}
        </p>
        <div className="song-head__actions">
          <button type="button" className="link" aria-pressed={isFavorite} onClick={() => dispatch(favoriteToggled(song.id))}>
            {isFavorite ? "Quitar de favoritas" : "Guardar en favoritas"}
          </button>
          {original.custom && (
            <Link to={`/editar/${song.id}`} className="link">
              Editar letra y acordes
            </Link>
          )}
        </div>
      </header>

      <div className="tools" role="toolbar" aria-label="Ajustes de la canción">
        <div className="tool">
          <span className="tool__label" id="lbl-tono">
            Tono
          </span>
          <div className="stepper" aria-labelledby="lbl-tono">
            <button type="button" onClick={() => dispatch(transposed({ id, delta: -1, baseCapo: original.capo }))} aria-label="Bajar medio tono">
              −
            </button>
            <output aria-live="polite">{keyText(song.key, notation)}</output>
            <button type="button" onClick={() => dispatch(transposed({ id, delta: 1, baseCapo: original.capo }))} aria-label="Subir medio tono">
              +
            </button>
          </div>
        </div>
        <div className="tool">
          <label className="tool__label" htmlFor="capo">
            Cejilla
          </label>
          <select id="capo" value={capo} onChange={(e) => dispatch(capoSet({ id, capo: Number(e.target.value) }))}>
            <option value={0}>No</option>
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Traste {n}
              </option>
            ))}
          </select>
        </div>
        <div className="tool">
          <span className="tool__label" id="lbl-letra">
            Letra
          </span>
          <div className="stepper stepper--small" aria-labelledby="lbl-letra">
            <button type="button" onClick={() => dispatch(prefsUpdated({ lyricSize: lyricSize - 1 }))} disabled={lyricSize <= LYRIC_SIZES.min} aria-label="Letra más pequeña">
              A−
            </button>
            <button type="button" onClick={() => dispatch(prefsUpdated({ lyricSize: lyricSize + 1 }))} disabled={lyricSize >= LYRIC_SIZES.max} aria-label="Letra más grande">
              A+
            </button>
          </div>
        </div>
        <div className="tool">
          <span className="tool__label" id="lbl-ver">
            Ver
          </span>
          <div className="segmented" role="group" aria-labelledby="lbl-ver">
            <button type="button" aria-pressed={sheetView === "acordes"} onClick={() => dispatch(prefsUpdated({ sheetView: "acordes" }))}>
              Con acordes
            </button>
            <button type="button" aria-pressed={sheetView === "letra"} onClick={() => dispatch(prefsUpdated({ sheetView: "letra" }))}>
              Solo letra
            </button>
          </div>
        </div>
        <div className="tool tool--scroll">
          <button type="button" className={`btn ${scroll.on ? "btn--ink" : ""}`} aria-pressed={scroll.on} onClick={() => scroll.setOn(!scroll.on)}>
            {scroll.on ? "Detener" : "Desplazar"}
          </button>
          <label className="sr-only" htmlFor="vel">
            Velocidad
          </label>
          <input id="vel" type="range" min={1} max={6} value={scroll.speed} onChange={(e) => scroll.setSpeed(Number(e.target.value))} />
        </div>
      </div>

      {(changed || capo > 0) && (
        <p className="tools__note">
          {capo > 0 && <>Con cejilla en el traste {capo} se tocan formas de {keyText(transposeKey(song.key, -capo), notation)}. </>}
          {changed && (
            <button type="button" className="link" onClick={() => dispatch(settingsReset(id))}>
              Volver a {keyText(original.key, notation)}
              {original.capo ? ` con cejilla en el ${original.capo}` : ""}
            </button>
          )}
        </p>
      )}

      <div className={`song-layout ${song.youtubeId ? "song-layout--video" : ""}`}>
        <div className="song-main">
          {sheetView === "acordes" && chords.length > 0 && (
            <div className="diagrams" aria-label="Acordes de la canción">
              {chords.map((c) => (
                <ChordDiagram key={c} shape={shape(c)} capo={capo} active={activeChord === c} onPlay={() => setActiveChord(c)} />
              ))}
            </div>
          )}

          {song.note && <p className="song-note">{song.note}</p>}

          <Sheet sections={song.sections} shape={shape} activeChord={activeChord} onChord={playChord} />
        </div>

        {song.youtubeId && (
          <aside className="song-aside">
            <Video id={song.youtubeId} title={song.title} />
          </aside>
        )}
      </div>

      <Improvise songKey={song.key} chords={chords} activeChord={activeChord} capo={capo} />
    </article>
  );
}
