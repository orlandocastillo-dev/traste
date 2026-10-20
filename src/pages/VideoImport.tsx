import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { Video } from "../components/Video";
import { useGetCatalogQuery } from "../features/catalog/catalogApi";
import { videoLinked } from "../features/library/librarySlice";
import { selectAllSongs } from "../features/library/selectors";
import { useLyricsSearchQuery, useVideoInfoQuery } from "../features/web/webApi";
import { findMatch } from "../lib/youtube";

export interface ImportDraft {
  title: string;
  artist: string;
  youtubeId: string;
  lyrics?: string;
}

/** Lo que pasa después de pegar un link: se identifica la canción y se busca su letra. */
export function VideoImport() {
  const { id = "" } = useParams();
  useGetCatalogQuery();
  const info = useVideoInfoQuery(id);

  return (
    <div className="page page--import">
      <Link to="/" className="back">
        Canciones
      </Link>
      {info.isLoading ? (
        <div className="import">
          <Video id={id} title="Video" />
          <p className="muted">Leyendo el video…</p>
        </div>
      ) : (
        // Al cambiar de video se reinicia el formulario con los datos nuevos.
        <ImportFlow
          key={`${id}-${info.data ? "ok" : "sin-datos"}`}
          id={id}
          initialTitle={info.data?.title ?? ""}
          initialArtist={info.data?.artist ?? ""}
          rawTitle={info.data?.rawTitle}
          channel={info.data?.channel}
          failed={info.isError}
        />
      )}
    </div>
  );
}

interface FlowProps {
  id: string;
  initialTitle: string;
  initialArtist: string;
  rawTitle?: string;
  channel?: string;
  failed: boolean;
}

function ImportFlow({ id, initialTitle, initialArtist, rawTitle, channel, failed }: FlowProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const songs = useAppSelector(selectAllSongs);
  const [title, setTitle] = useState(initialTitle);
  const [artist, setArtist] = useState(initialArtist);
  const [searched, setSearched] = useState<{ title: string; artist: string } | null>(
    initialTitle ? { title: initialTitle, artist: initialArtist } : null,
  );

  const match = searched ? findMatch(songs, searched.title, id) : undefined;
  const lyrics = useLyricsSearchQuery(searched ?? { title: "", artist: "" }, { skip: !searched || !!match });

  const openMatch = () => {
    if (!match) return;
    dispatch(videoLinked({ id: match.id, youtubeId: id }));
    navigate(`/cancion/${match.id}`);
  };

  const startDraft = (draft: Omit<ImportDraft, "youtubeId">) => navigate("/nueva", { state: { ...draft, youtubeId: id } satisfies ImportDraft });

  return (
    <>
      <div className="import">
        <Video id={id} title={title || "Video"} />

        <div className="import__body">
          {failed && <p className="muted">No pudimos leer el título del video. Escribe el nombre de la canción y busca.</p>}
          <form
            className="import__form"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) setSearched({ title: title.trim(), artist: artist.trim() });
            }}
          >
            <div className="field">
              <label htmlFor="imp-titulo">Canción</label>
              <input id="imp-titulo" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="imp-artista">Artista</label>
              <input id="imp-artista" value={artist} onChange={(e) => setArtist(e.target.value)} />
            </div>
            <button type="submit" className="btn" disabled={!title.trim()}>
              {searched ? "Buscar de nuevo" : "Buscar letra"}
            </button>
          </form>
          {rawTitle && (
            <p className="muted small">
              En YouTube: “{rawTitle}”{channel ? `, de ${channel}` : ""}.
            </p>
          )}
        </div>
      </div>

      {match ? (
        <section className="result">
          <h2>Ya la tienes</h2>
          <p>
            “{match.title}” está en tu biblioteca con letra y acordes. Al abrirla, este video queda guardado con la canción.
          </p>
          <button type="button" className="btn btn--ink" onClick={openMatch}>
            Abrir {match.title}
          </button>
        </section>
      ) : searched ? (
        <section className="result" aria-live="polite">
          <h2>Letra</h2>
          {lyrics.isFetching ? (
            <p className="muted">Buscando la letra de “{searched.title}”…</p>
          ) : lyrics.isError ? (
            <p>{(lyrics.error as { message?: string })?.message}</p>
          ) : lyrics.data?.length ? (
            <>
              <p className="muted">Elige la versión que corresponde al video. Después le pones los acordes.</p>
              <ul className="lyrics-results">
                {lyrics.data.map((r) => (
                  <li key={r.id}>
                    <div>
                      <p className="lyrics-results__name">
                        {r.trackName} <span className="muted">de {r.artistName}</span>
                      </p>
                      <p className="lyrics-results__preview">{r.plainLyrics.split("\n").filter(Boolean).slice(0, 2).join(" / ")}</p>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => startDraft({ title: r.trackName, artist: r.artistName, lyrics: r.plainLyrics })}
                    >
                      Usar esta letra
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>No encontramos la letra de “{searched.title}”. Revisa el nombre arriba o escríbela tú.</p>
          )}
          <button type="button" className="link" onClick={() => startDraft({ title, artist })}>
            Escribir o pegar la letra yo mismo
          </button>
          <p className="muted small">Las letras vienen de LRCLIB, una base de datos abierta, y se guardan solo en este dispositivo.</p>
        </section>
      ) : null}
    </>
  );
}
