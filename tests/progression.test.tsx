import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { makeStore } from "../src/app/store";
import { Layout } from "../src/components/Layout";
import { isInKey, rankKeys, romanNumeral } from "../src/lib/music";
import { capoSuggestion, parseProgression } from "../src/lib/progression";
import { Progresion } from "../src/pages/Progresion";

vi.mock("../src/lib/audio", () => ({ strum: vi.fn(), playSequence: vi.fn() }));

describe("análisis de progresiones", () => {
  it("lee acordes con distintos separadores y en cifrado latino", () => {
    expect(parseProgression("G - D | Em, C")).toEqual({ chords: ["G", "D", "Em", "C"], invalid: [] });
    expect(parseProgression("Do Sol Lam Fa")).toEqual({ chords: ["C", "G", "Am", "F"], invalid: [] });
    expect(parseProgression("G hola D").invalid).toEqual(["hola"]);
  });

  it("ordena las tonalidades posibles", () => {
    expect(rankKeys(["G", "D", "Em", "C"])[0].key).toBe("G");
    expect(rankKeys(["Em", "C", "G", "D"])[0].key).toBe("Em");
    expect(rankKeys(["Bm", "G", "D", "A"])[0].key).toBe("Bm");
    expect(rankKeys(["E", "B", "C#m", "A"])[0]).toMatchObject({ key: "E", inKey: 4, total: 4 });
  });

  it("cifra cada acorde con su grado", () => {
    expect(["G", "D", "Em", "C", "D7", "A/C#"].map((c) => romanNumeral(c, "G"))).toEqual(["I", "V", "vi", "IV", "V7", "II/C#"]);
    expect(["Am", "F", "C", "G", "E7"].map((c) => romanNumeral(c, "Am"))).toEqual(["i", "VI", "III", "VII", "V7"]);
    expect(romanNumeral("Bb", "C")).toBe("bVII");
  });

  it("marca los acordes prestados", () => {
    expect(isInKey("Bb", "C")).toBe(false);
    expect(isInKey("E", "Am")).toBe(true);
    expect(isInKey("Bdim", "C")).toBe(true);
  });

  it("sugiere cejilla para tonalidades incómodas", () => {
    expect(capoSuggestion("G")).toBeNull();
    expect(capoSuggestion("Bb")).toEqual({ capo: 1, shapes: "A" });
    expect(capoSuggestion("F#m")).toEqual({ capo: 2, shapes: "Em" });
  });
});

function renderAt(path: string) {
  const router = createMemoryRouter(
    [{ path: "/", element: <Layout />, children: [{ path: "progresion", element: <Progresion /> }] }],
    { initialEntries: [path] },
  );
  render(
    <Provider store={makeStore()}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return router;
}

describe("página Progresión", () => {
  it("no falla aunque el navegador devuelva una promesa en scrollTo", () => {
    // Chrome reciente devuelve una promesa; antes React la tomaba como limpieza del efecto y la app caía.
    const spy = vi.spyOn(window, "scrollTo").mockImplementation((() => Promise.resolve()) as never);
    const router = renderAt("/progresion");
    expect(() => router.navigate("/progresion?acordes=G")).not.toThrow();
    spy.mockRestore();
  });

  it("muestra tonalidad, grados y escalas", async () => {
    const router = renderAt("/progresion");
    await userEvent.type(screen.getByLabelText("Acordes de la progresión"), "Bb F Gm Eb");
    expect(document.querySelector(".analysis__key")).toHaveTextContent("Bb mayor");
    expect(screen.getByText(/cejilla en el traste 1 la tocas con formas de A mayor/)).toBeInTheDocument();
    expect(screen.getAllByText(/^(I|V|vi|IV)$/).map((n) => n.textContent)).toEqual(["I", "V", "vi", "IV"]);
    expect(screen.getByRole("radio", { name: /Pentatónica mayor de Bb/ })).toBeInTheDocument();
    expect(router.state.location.search).toBe("?acordes=Bb-F-Gm-Eb");
  });

  it("abre con la progresión de la dirección y permite elegir la relativa", async () => {
    renderAt("/progresion?acordes=G-D-Em-C");
    expect(screen.getByDisplayValue("G D Em C")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "E menor" }));
    expect(screen.getAllByText(/^(III|VII|i|VI)$/).map((n) => n.textContent)).toEqual(["III", "VII", "i", "VI"]);
  });
});
