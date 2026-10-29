import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeStore } from "../src/app/store";
import { ChordDiagram } from "../src/components/ChordDiagram";
import { Fretboard } from "../src/components/Fretboard";
import { scalePatterns } from "../src/lib/positions";
import { GuitarNeck } from "../src/components/GuitarNeck";
import { strum } from "../src/lib/audio";
import { Sheet } from "../src/components/Sheet";
import { songSaved } from "../src/features/library/librarySlice";
import { prefsUpdated } from "../src/features/prefs/prefsSlice";
import { Biblioteca } from "../src/pages/Biblioteca";
import { Cancion } from "../src/pages/Cancion";
import { EditarCancion } from "../src/pages/EditarCancion";
import { VideoImport } from "../src/pages/VideoImport";
import type { Song } from "../src/types";

vi.mock("../src/lib/audio", () => ({ strum: vi.fn(), playSequence: vi.fn() }));

const catalog = {
  aviso: "",
  canciones: [
    {
      id: "amazing-grace",
      title: "Amazing Grace",
      artist: "John Newton",
      key: "G",
      lang: "en",
      sections: [{ name: "Estrofa 1", lines: ["A[G]mazing [G7]grace, how [C]sweet the [G]sound"] }],
    },
  ],
};

const lyrics = [{ id: 7, trackName: "Nearer, My God, to Thee", artistName: "Sarah Adams", plainLyrics: "Nearer, my God, to Thee\nnearer to Thee" }];

/** Respuestas falsas para el catálogo, oEmbed y LRCLIB: las pruebas no salen a internet. */
function mockFetch(title = "Himnos Antiguos - Nearer My God To Thee (Lyric Video)") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
      if (url.includes("canciones.json")) return json(catalog);
      if (url.includes("noembed")) return json({ title, author_name: "Himnos Antiguos" });
      if (url.includes("lrclib")) return json(lyrics);
      return new Response("", { status: 404 });
    }),
  );
}
mockFetch();
afterEach(() => mockFetch());

function withStore(ui: React.ReactNode, store = makeStore()) {
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}

function renderAt(path: string, store = makeStore()) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <Biblioteca /> },
      { path: "/cancion/:id", element: <Cancion /> },
      { path: "/video/:id", element: <VideoImport /> },
      { path: "/nueva", element: <EditarCancion /> },
    ],
    { initialEntries: [path] },
  );
  return { router, ...withStore(<RouterProvider router={router} />, store) };
}

const song: Song = {
  id: "mia-1",
  title: "Prueba en Am",
  artist: "Orlando",
  key: "Am",
  lang: "es",
  custom: true,
  sections: [{ name: "Estrofa 1", lines: ["[Am]Tú eres [G]santo, [F]Señor [E]Dios"] }],
};

describe("Sheet", () => {
  it("pone cada acorde sobre su palabra", () => {
    withStore(<Sheet sections={song.sections} />);
    const line = screen.getByText("Tú").closest(".sheet__line") as HTMLElement;
    expect(within(line).getAllByRole("button").map((b) => b.textContent)).toEqual(["Am", "G", "F", "E"]);
  });

  it("muestra solo la letra cuando se elige", () => {
    const store = makeStore();
    store.dispatch(prefsUpdated({ sheetView: "letra" }));
    withStore(<Sheet sections={song.sections} />, store);
    expect(screen.getByText("Tú eres santo, Señor Dios")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("muestra los acordes que se tocan con cejilla", () => {
    withStore(<Sheet sections={song.sections} shape={(c) => (c === "Am" ? "Em" : c)} />);
    expect(screen.getByRole("button", { name: "Em" })).toBeInTheDocument();
  });
});

describe("ChordDiagram y Fretboard", () => {
  it("describe el acorde para lectores de pantalla", () => {
    withStore(<ChordDiagram shape="Am" />);
    expect(screen.getByRole("button")).toHaveAccessibleName(/Am\. cuerda 6: no se toca, cuerda 5: al aire, cuerda 4: traste 2/);
  });

  it("usa la notación latina", () => {
    const store = makeStore();
    store.dispatch(prefsUpdated({ notation: "latina" }));
    withStore(<ChordDiagram shape="F#m" />, store);
    expect(screen.getByText("Fa#m")).toBeInTheDocument();
  });

  it("marca la tónica y atenúa fuera de la posición", () => {
    const { container } = withStore(<Fretboard notes={["A", "C", "D", "E", "G"]} tonic="A" cells={scalePatterns("A", "minor pentatonic")[0].cells} label="Pentatónica" />);
    // La entre los trastes 0 y 15: 6.ª 5, 5.ª 0 y 12, 4.ª 7, 3.ª 2 y 14, 2.ª 10, 1.ª 5.
    expect(container.querySelectorAll(".fb__note.is-tonic")).toHaveLength(8);
    expect(container.querySelectorAll(".fb__note.is-tonic:not(.is-out)")).toHaveLength(3);
  });
});

describe("canción", () => {
  it("transpone letra y acordes con los botones", async () => {
    const store = makeStore();
    store.dispatch(songSaved(song));
    renderAt("/cancion/mia-1", store);
    expect(await screen.findByRole("heading", { name: "Prueba en Am" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Subir medio tono" }));
    expect(screen.getByText("Bb menor")).toBeInTheDocument();
    const sheetLine = screen.getByText("Tú").closest(".sheet__line") as HTMLElement;
    expect(within(sheetLine).getAllByRole("button").map((b) => b.textContent)).toEqual(["Bbm", "Ab", "Gb", "F"]);
  });

  it("sugiere la menor armónica cuando hay V mayor", async () => {
    const store = makeStore();
    store.dispatch(songSaved(song));
    renderAt("/cancion/mia-1", store);
    const harmonic = await screen.findByRole("radio", { name: /Menor armónica de A/ });
    await userEvent.click(harmonic);
    expect(harmonic).toHaveAttribute("aria-checked", "true");
  });
});

describe("desde un link de YouTube", () => {
  it("lleva el link pegado a la página de importar", async () => {
    const { router } = renderAt("/");
    await userEvent.type(screen.getByRole("searchbox"), "https://youtu.be/BBBBBBBBBBB");
    await userEvent.click(screen.getByRole("button", { name: "Buscar letra" }));
    expect(router.state.location.pathname).toBe("/video/BBBBBBBBBBB");
  });

  it("reconoce una canción que ya está en la biblioteca", async () => {
    mockFetch("Amazing Grace (Hymn with Lyrics)");
    const { store } = renderAt("/video/AAAAAAAAAAA");
    expect(await screen.findByRole("heading", { name: "Ya la tienes" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Abrir Amazing Grace" }));
    expect(store.getState().library.videos).toEqual({ "amazing-grace": "AAAAAAAAAAA" });
  });

  it("busca la letra, se colocan los acordes y se guarda", async () => {
    const { store } = renderAt("/video/BBBBBBBBBBB");
    expect(await screen.findByDisplayValue("Nearer My God To Thee")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Himnos Antiguos")).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Usar esta letra" }));

    // El editor abre en "Colocar acordes": se elige G y se toca la primera palabra.
    await userEvent.click(await screen.findByRole("radio", { name: "D" }));
    await userEvent.click(screen.getByRole("button", { name: "Nearer," }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar canción" }));

    expect(await screen.findByRole("heading", { name: "Nearer, My God, to Thee" })).toBeInTheDocument();
    const saved = Object.values(store.getState().library.entities)[0]!;
    expect(saved.youtubeId).toBe("BBBBBBBBBBB");
    expect(saved.key).toBe("D");
    expect(saved.sections[0].lines[0]).toBe("[D]Nearer, my God, to Thee");
  });

  it("convierte una hoja pegada con los acordes encima", async () => {
    const { store } = renderAt("/nueva");
    await userEvent.type(screen.getByLabelText("Canción"), "Hoja pegada");
    const area = screen.getByLabelText("Letra y acordes");
    await userEvent.click(area);
    await userEvent.paste("G       C\nSanto es el Señor\nRe    Sol\nDigno de alabar");
    await userEvent.click(screen.getByRole("button", { name: "Guardar canción" }));
    await screen.findByRole("heading", { name: "Hoja pegada" });
    const saved = Object.values(store.getState().library.entities)[0]!;
    expect(saved.sections[0].lines).toEqual(["[G]Santo es [C]el Señor", "[D]Digno [G]de alabar"]);
    expect(saved.key).toBe("G");
  });
});

describe("mástil de la portada", () => {
  it("muestra el acorde, cambia al tocar otro y lo hace sonar", async () => {
    render(
      <Provider store={makeStore()}>
        <GuitarNeck />
      </Provider>,
    );
    expect(screen.getByRole("img", { name: /acorde G$/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Em/ }));
    expect(screen.getByRole("img", { name: /acorde Em$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Em/ })).toHaveAttribute("aria-pressed", "true");
    expect(strum).toHaveBeenCalled();
  });

  it("usa el cifrado latino si está elegido", () => {
    const store = makeStore();
    store.dispatch(prefsUpdated({ notation: "latina" }));
    render(
      <Provider store={store}>
        <GuitarNeck />
      </Provider>,
    );
    expect(screen.getByRole("img", { name: /acorde Sol$/ })).toBeInTheDocument();
  });
});
