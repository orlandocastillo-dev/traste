import { useDeferredValue, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAppSelector } from "../app/hooks";
import { GuitarNeck } from "../components/GuitarNeck";
import { useGetCatalogQuery } from "../features/catalog/catalogApi";
import { searchSongs, selectAllSongs } from "../features/library/selectors";
import { keyText } from "../lib/format";
import { parseProgression } from "../lib/progression";
import { isYouTubeLink, parseYouTubeId } from "../lib/youtube";
import type { Song } from "../types";

type Filter = "todas" | "es" | "en" | "favoritas" | "mias" | "practica";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "es", label: "Español" },
  { id: "en", label: "Inglés" },
  { id: "favoritas", label: "Favoritas" },
  { id: "mias", label: "Mis canciones" },
  { id: "practica", label: "Práctica" },
];

export function Biblioteca() {
  const { isLoading, isError, refetch } = useGetCatalogQuery();
  const songs = useAppSelector(selectAllSongs);
  const favorites = useAppSelector((s) => s.library.favorites);
  const recentIds = useAppSelector((s) => s.library.recent);
  const notation = useAppSelector((s) => s.prefs.notation);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");
  const deferred = useDeferredValue(query);
  const isLink = isYouTubeLink(query);
  const typed = parseProgression(query);
  const looksLikeProgression = !isLink && typed.chords.length >= 3 && typed.invalid.length === 0;

  const visible = useMemo(() => {
    let list = isYouTubeLink(deferred) ? songs : searchSongs(songs, deferred);
    const practice = (s: Song) => s.tags?.includes("práctica");
    if (filter === "es" || filter === "en") list = list.filter((s) => s.lang === filter && !practice(s));
    if (filter === "favoritas") list = list.filter((s) => favorites.includes(s.id));
    if (filter === "mias") list = list.filter((s) => s.custom);
    if (filter === "practica") list = list.filter(practice);
    return list;
  }, [songs, deferred, filter, favorites]);

  const recent = recentIds
    .map((id) => songs.find((s) => s.id === id))
    .filter((s): s is Song => !!s)
    .slice(0, 3);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = parseYouTubeId(query);
    if (id) navigate(`/video/${id}`);
  };

  return (
    <div className="page page--home">
      <section className="intro">
        <form className="finder" onSubmit={submit} role="search">
          <p className="intro__kicker">Para guitarristas de alabanza</p>
          <h1 className="intro__title">
            La letra y los acordes de la canción del domingo, <em>en su sitio</em>.
          </h1>
          <label htmlFor="buscar" className="finder__label">
            Pega el link de YouTube de la canción que vas a tocar
          </label>
          <div className="finder__row">
            <input
              id="buscar"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="youtube.com/watch?v=…"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint={isLink ? "go" : "search"}
            />
            {isLink && (
              <button type="submit" className="btn btn--ink">
                Buscar letra
              </button>
            )}
          </div>
          {looksLikeProgression && (
            <p>
              <Link className="link" to={`/progresion?acordes=${typed.chords.map(encodeURIComponent).join("-")}`}>
                Ver la tonalidad y las escalas de {typed.chords.join(" ")}
              </Link>
            </p>
          )}
          <p className="finder__hint">
            Traemos la letra y le pones los acordes. También puedes buscar aquí por nombre, una frase o un acorde como F#m.
          </p>
        </form>
        <GuitarNeck />
      </section>

      {!query && recent.length > 0 && (
        <p className="recent">
          <span className="muted">Hace poco: </span>
          {recent.map((s, i) => (
            <span key={s.id}>
              {i > 0 && ", "}
              <Link to={`/cancion/${s.id}`}>{s.title}</Link>
            </span>
          ))}
        </p>
      )}

      <div className="list-head">
        <div className="tabs" role="group" aria-label="Filtrar canciones">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <Link to="/nueva" className="link">
          Nueva canción
        </Link>
      </div>

      {isLoading ? (
        <p className="muted">Cargando canciones…</p>
      ) : isError ? (
        <div className="empty">
          <p>No se pudieron cargar los himnos incluidos.</p>
          <button type="button" className="btn" onClick={() => refetch()}>
            Reintentar
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          {filter === "favoritas" ? (
            <p>Aún no tienes favoritas. Ábrelas desde la canción con “Guardar en favoritas”.</p>
          ) : filter === "mias" ? (
            <p>Pega arriba el link de YouTube de una canción para traer su letra, o escríbela tú.</p>
          ) : (
            <p>Nada coincide con “{query}”. Prueba con el link de YouTube de la canción.</p>
          )}
        </div>
      ) : (
        <ol className="songs">
          {visible.map((s) => (
            <li key={s.id}>
              <Link to={`/cancion/${s.id}`} className="song">
                <span className="song__title">
                  {s.title}
                  {favorites.includes(s.id) && <span className="song__fav" aria-label=", favorita" />}
                </span>
                <span className="song__by">{s.artist}</span>
                <span className="song__key">{keyText(s.key, notation)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
