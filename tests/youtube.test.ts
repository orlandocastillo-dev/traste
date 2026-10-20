import { describe, expect, it } from "vitest";
import { findMatch, parseVideoTitle, parseYouTubeId, titleSimilarity } from "../src/lib/youtube";
import type { Song } from "../src/types";

describe("links de YouTube", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30s", "dQw4w9WgXcQ"],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=x", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("%s", (link, id) => {
    expect(parseYouTubeId(link)).toBe(id);
  });

  it("rechaza lo que no es de YouTube", () => {
    expect(parseYouTubeId("https://vimeo.com/123")).toBeNull();
    expect(parseYouTubeId("santo santo santo")).toBeNull();
  });
});

describe("título del video", () => {
  it("separa artista y canción y quita el ruido", () => {
    expect(parseVideoTitle("Elevation Worship - Tu Fidelidad (Video Oficial)", "Elevation Worship")).toEqual({
      title: "Tu Fidelidad",
      artist: "Elevation Worship",
    });
    expect(parseVideoTitle("Grande y Fuerte | En Vivo | Miel San Marcos", "Miel San Marcos")).toEqual({
      title: "Grande y Fuerte",
      artist: "Miel San Marcos",
    });
  });

  it("detecta cuando el orden es canción - artista", () => {
    expect(parseVideoTitle("Mi Canción - Grupo Alabanza (Lyric Video)", "Grupo Alabanza Oficial")).toEqual({
      title: "Mi Canción",
      artist: "Grupo Alabanza",
    });
  });

  it("usa el canal cuando al otro lado del guion no hay un artista", () => {
    expect(parseVideoTitle("Nearer My God To Thee - Hymn [HD]", "Himnos Antiguos")).toEqual({
      title: "Nearer My God To Thee",
      artist: "Himnos Antiguos",
    });
  });
});

describe("buscar la canción en la biblioteca", () => {
  const songs = [
    { id: "amazing-grace", title: "Amazing Grace" },
    { id: "great", title: "Great Is Thy Faithfulness" },
    { id: "mia", title: "Otra", youtubeId: "zzzzzzzzzzz" },
  ] as Song[];

  it("encuentra por título parecido", () => {
    expect(findMatch(songs, "Amazing Grace")?.id).toBe("amazing-grace");
    expect(findMatch(songs, "Great is thy faithfulness")?.id).toBe("great");
    expect(titleSimilarity("Grace", "Amazing Grace")).toBeLessThan(1);
  });

  it("prefiere el video ya asociado", () => {
    expect(findMatch(songs, "cualquier cosa", "zzzzzzzzzzz")?.id).toBe("mia");
  });

  it("no inventa coincidencias", () => {
    expect(findMatch(songs, "Tu fidelidad")).toBeUndefined();
  });
});
