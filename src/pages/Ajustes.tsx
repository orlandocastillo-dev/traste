import { useAppDispatch, useAppSelector } from "../app/hooks";
import { prefsUpdated } from "../features/prefs/prefsSlice";

export function Ajustes() {
  const dispatch = useAppDispatch();
  const prefs = useAppSelector((s) => s.prefs);

  return (
    <div className="page page--narrow">
      <header className="page-head">
        <h1>Ajustes</h1>
      </header>

      <section className="card">
        <div className="pref">
          <div>
            <p className="pref__title">Tema</p>
            <p className="muted small">El oscuro cansa menos la vista en la tarima o de noche.</p>
          </div>
          <div className="segmented" role="group" aria-label="Tema">
            {(["auto", "claro", "oscuro"] as const).map((t) => (
              <button key={t} type="button" aria-pressed={prefs.theme === t} onClick={() => dispatch(prefsUpdated({ theme: t }))}>
                {t === "auto" ? "Como el sistema" : t === "claro" ? "Claro" : "Oscuro"}
              </button>
            ))}
          </div>
        </div>

        <div className="pref">
          <div>
            <p className="pref__title">Nombres de las notas</p>
            <p className="muted small">Cifrado americano (C, D, E) o latino (Do, Re, Mi).</p>
          </div>
          <div className="segmented" role="group" aria-label="Notación">
            <button type="button" aria-pressed={prefs.notation === "americana"} onClick={() => dispatch(prefsUpdated({ notation: "americana" }))}>
              C D E
            </button>
            <button type="button" aria-pressed={prefs.notation === "latina"} onClick={() => dispatch(prefsUpdated({ notation: "latina" }))}>
              Do Re Mi
            </button>
          </div>
        </div>

        <div className="pref">
          <div>
            <p className="pref__title">En el diapasón mostrar</p>
            <p className="muted small">El nombre de cada nota o su intervalo respecto a la tónica (1, b3, 5...).</p>
          </div>
          <div className="segmented" role="group" aria-label="Etiquetas del diapasón">
            <button type="button" aria-pressed={prefs.fretLabels === "notas"} onClick={() => dispatch(prefsUpdated({ fretLabels: "notas" }))}>
              Notas
            </button>
            <button type="button" aria-pressed={prefs.fretLabels === "intervalos"} onClick={() => dispatch(prefsUpdated({ fretLabels: "intervalos" }))}>
              Intervalos
            </button>
          </div>
        </div>

        <label className="pref">
          <span>
            <span className="pref__title">Guitarra para zurdos</span>
            <span className="muted small">Diagramas y diapasón en espejo.</span>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={prefs.leftHanded}
            onChange={(e) => dispatch(prefsUpdated({ leftHanded: e.target.checked }))}
          />
        </label>
      </section>

      <p className="colophon">
        Los himnos incluidos son de dominio público. Las letras que traes desde YouTube vienen de LRCLIB y se guardan solo en este
        dispositivo. Hecho por Orlando Castillo.
      </p>
    </div>
  );
}
