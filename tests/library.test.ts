import { describe, expect, it } from "vitest";
import { makeStore } from "../src/app/store";
import {
  capoSet,
  favoriteToggled,
  settingsReset,
  songDeleted,
  songOpened,
  songSaved,
  transposed,
  videoLinked,
} from "../src/features/library/librarySlice";
import { searchSongs, selectAllSongs, settingsFor, transposeSong, uniqueChords } from "../src/features/library/selectors";
import { prefsUpdated } from "../src/features/prefs/prefsSlice";
import type { Song } from "../src/types";

const song: Song = {
  id: "mia-prueba",
  title: "Canción de prueba",
  artist: "Orlando",
  key: "G",
  lang: "es",
  custom: true,
  sections: [
    { name: "Estrofa 1", lines: ["[G]Señor, tu a[D/F#]mor", "es [Em]fiel por [C]siempre"] },
    { name: "Coro", lines: ["[C]Santo [D]eres [G]tú"] },
  ],
};

const catalog: Song[] = [
  { ...song, id: "a", title: "Castillo fuerte", artist: "Lutero", key: "C", custom: undefined, sections: [{ name: "Estrofa", lines: ["[C]Castillo [G]fuerte es nuestro Dios"] }] },
  { ...song, id: "b", title: "Oh, qué amigo nos es Cristo", artist: "Converse", custom: undefined, sections: [{ name: "Estrofa", lines: ["[G]todo a Dios en [F#m]oración"] }] },
];

describe("biblioteca", () => {
  it("guarda, edita y elimina canciones propias", () => {
    const store = makeStore();
    store.dispatch(songSaved(song));
    expect(selectAllSongs(store.getState())).toHaveLength(1);
    store.dispatch(songSaved({ ...song, title: "Otro nombre" }));
    expect(selectAllSongs(store.getState())[0].title).toBe("Otro nombre");

    store.dispatch(favoriteToggled(song.id));
    store.dispatch(songOpened(song.id));
    store.dispatch(songDeleted(song.id));
    const { library } = store.getState();
    expect(library.ids).toHaveLength(0);
    expect(library.favorites).toEqual([]);
    expect(library.recent).toEqual([]);
  });

  it("recuerda las últimas 6 abiertas, sin repetir", () => {
    const store = makeStore();
    for (const id of ["1", "2", "3", "4", "5", "6", "7", "3"]) store.dispatch(songOpened(id));
    expect(store.getState().library.recent).toEqual(["3", "7", "6", "5", "4", "2"]);
  });

  it("mantiene la transposición entre -6 y +6 y conserva la cejilla original", () => {
    const store = makeStore();
    for (let i = 0; i < 7; i++) store.dispatch(transposed({ id: "a", delta: 1, baseCapo: 2 }));
    expect(store.getState().library.settings.a).toEqual({ transpose: -5, capo: 2 });
  });

  it("limita la cejilla y vuelve al original", () => {
    const store = makeStore();
    store.dispatch(capoSet({ id: "a", capo: 14 }));
    expect(store.getState().library.settings.a.capo).toBe(9);
    store.dispatch(settingsReset("a"));
    expect(settingsFor(store.getState(), "a", { ...song, capo: 2 })).toEqual({ transpose: 0, capo: 2 });
  });

  it("asocia un video a una canción propia o del catálogo", () => {
    const store = makeStore();
    store.dispatch(songSaved(song));
    store.dispatch(videoLinked({ id: song.id, youtubeId: "abcdefghijk" }));
    store.dispatch(videoLinked({ id: "amazing-grace", youtubeId: "AAAAAAAAAAA" }));
    const { library } = store.getState();
    expect(library.entities[song.id]?.youtubeId).toBe("abcdefghijk");
    expect(library.videos).toEqual({ "amazing-grace": "AAAAAAAAAAA" });
    store.dispatch(videoLinked({ id: "amazing-grace", youtubeId: null }));
    expect(store.getState().library.videos).toEqual({});
  });

  it("limita el tamaño de la letra", () => {
    const store = makeStore();
    store.dispatch(prefsUpdated({ lyricSize: 99, notation: "latina" }));
    expect(store.getState().prefs).toMatchObject({ lyricSize: 30, notation: "latina", sheetView: "acordes", theme: "auto" });
  });
});

describe("selectores", () => {
  it("transpone letra y acordes", () => {
    const up = transposeSong(song, 2);
    expect(up.key).toBe("A");
    expect(up.sections[0].lines).toEqual(["[A]Señor, tu a[E/G#]mor", "es [F#m]fiel por [D]siempre"]);
    expect(transposeSong(song, 0)).toBe(song);
  });

  it("lista los acordes sin repetir y en orden de aparición", () => {
    expect(uniqueChords(song)).toEqual(["G", "D/F#", "Em", "C", "D"]);
  });

  it("busca sin tildes por título o autor", () => {
    expect(searchSongs(catalog, "que amigo").map((s) => s.id)).toEqual(["b"]);
    expect(searchSongs(catalog, "LUTERO").map((s) => s.id)).toEqual(["a"]);
    expect(searchSongs(catalog, "")).toHaveLength(2);
  });

  it("busca por una frase de la letra", () => {
    expect(searchSongs(catalog, "nuestro dios").map((s) => s.id)).toEqual(["a"]);
  });

  it("busca por acorde exacto", () => {
    expect(searchSongs(catalog, "F#m").map((s) => s.id)).toEqual(["b"]);
  });
});
