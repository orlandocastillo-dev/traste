import { useState } from "react";
import { embedUrl, thumbnailUrl, watchUrl } from "../lib/youtube";

/**
 * El video se carga solo cuando se pide: la miniatura pesa unos KB y el reproductor de YouTube, más de 1 MB.
 * Desde un archivo abierto con doble clic YouTube a veces no deja reproducir; por eso siempre está el enlace.
 */
export function Video({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="video">
      <div className="video__frame">
        {playing ? (
          <iframe
            src={`${embedUrl(id)}&autoplay=1`}
            title={`Video: ${title}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" className="video__poster" onClick={() => setPlaying(true)} aria-label={`Reproducir ${title}`}>
            <img src={thumbnailUrl(id)} alt="" loading="lazy" />
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="23" />
              <path d="M19 15l14 9-14 9z" />
            </svg>
          </button>
        )}
      </div>
      <figcaption>
        <a href={watchUrl(id)} target="_blank" rel="noreferrer">
          Abrir en YouTube
        </a>
      </figcaption>
    </figure>
  );
}
