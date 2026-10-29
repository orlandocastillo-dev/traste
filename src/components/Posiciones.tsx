import type { Pattern } from "../lib/positions";

/** Todo el mástil o una de las posiciones de la escala, con un toque. */
export function Posiciones({ patterns, value, onChange }: { patterns: Pattern[]; value: string; onChange: (id: string) => void }) {
  const actual = patterns.find((p) => p.id === value);
  return (
    <div className="posiciones" role="group" aria-label="Posición en el mástil">
      <button type="button" className="posiciones__boton" aria-pressed={!actual} onClick={() => onChange("todo")}>
        Todo
      </button>
      {patterns.map((p, i) => (
        <button key={p.id} type="button" className="posiciones__boton" aria-pressed={actual?.id === p.id} aria-label={p.name} onClick={() => onChange(p.id)}>
          {i + 1}
        </button>
      ))}
      <span className="posiciones__trastes" aria-live="polite">
        {actual ? `Trastes ${actual.range[0]} a ${actual.range[1]}` : "Todas las notas de la escala"}
      </span>
    </div>
  );
}
