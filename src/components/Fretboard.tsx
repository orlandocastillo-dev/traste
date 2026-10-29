import { useEffect, useId, useRef } from "react";
import { useAppSelector } from "../app/hooks";
import { chroma, intervalLabel, noteLabel, spell, usesFlats } from "../lib/music";
import type { Cell } from "../lib/positions";
import { TUNING } from "../lib/voicings";

interface Props {
  /** Notas a marcar (nombres, ej. ["A", "C", "D", "E", "G"]). */
  notes: string[];
  tonic: string;
  /** Notas del acorde que suena, para resaltarlas dentro de la escala. */
  highlight?: number[];
  /** Las casillas de la posición que se estudia; las demás notas de la escala se atenúan. */
  cells?: Cell[];
  frets?: number;
  /** Cejilla: las notas detrás de ella no se pueden tocar y se ocultan. */
  capo?: number;
  label: string;
}

const MARKERS = [3, 5, 7, 9, 15, 17];

// Diapasón completo en SVG
export function Fretboard({ notes, tonic, highlight = [], cells, frets = 15, capo = 0, label }: Props) {
  const { notation, leftHanded, fretLabels } = useAppSelector((s) => s.prefs);
  const id = useId().replace(/:/g, "");
  const pcs = new Set(notes.map(chroma));
  const enPosicion = cells ? new Set(cells.map((c) => `${c.s}-${c.f}`)) : null;
  const caja = useRef<HTMLDivElement>(null);
  const desde = cells?.length ? Math.min(...cells.map((c) => c.f)) : 0;
  const tonicPc = chroma(tonic);
  const flats = usesFlats(tonic) || notes.some((n) => n.includes("b"));

  const fretW = 56;
  const openW = 40;
  const stringGap = 26;
  const top = 18;
  const width = openW + frets * fretW + 10;
  const height = top + stringGap * 5 + 34;
  // Posición X del centro de un traste (0 = cuerda al aire, antes de la cejuela).
  const cx = (f: number) => {
    const x = f === 0 ? openW / 2 : openW + (f - 0.5) * fretW;
    return leftHanded ? width - x : x;
  };
  const lineX = (f: number) => (leftHanded ? width - (openW + f * fretW) : openW + f * fretW);
  useEffect(() => {
    const el = caja.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const x = ((leftHanded ? width - (openW + desde * fretW) : openW + Math.max(0, desde - 1) * fretW) / width) * el.scrollWidth;
    el.scrollTo({ left: leftHanded ? x - el.clientWidth : x - 12, behavior: "smooth" });
  }, [desde, leftHanded, width]);
  const strings = [5, 4, 3, 2, 1, 0]; // índice en TUNING, de la primera a la sexta cuerda

  return (
    <div className="fretboard" role="img" aria-label={label} ref={caja}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ minWidth: Math.min(width, 640) }} aria-hidden="true">
        {/* Palo de rosa, trastes de níquel y cuerdas entorchadas */}
        <defs>
          <linearGradient id={`madera-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a2c1d" />
            <stop offset="0.5" stopColor="#3a2216" />
            <stop offset="1" stopColor="#2b1810" />
          </linearGradient>
          <linearGradient id={`traste-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8b8f96" />
            <stop offset="0.5" stopColor="#eef0f3" />
            <stop offset="1" stopColor="#8b8f96" />
          </linearGradient>
        </defs>
        <rect x={leftHanded ? 10 : openW} y={top - 8} width={frets * fretW} height={stringGap * 5 + 16} rx={3} fill={`url(#madera-${id})`} />
        {MARKERS.filter((m) => m <= frets).map((m) => (
          <circle key={m} cx={cx(m)} cy={top + stringGap * 2.5} r={6} className="fb__inlay" />
        ))}
        {frets >= 12 && (
          <>
            <circle cx={cx(12)} cy={top + stringGap * 1.5} r={6} className="fb__inlay" />
            <circle cx={cx(12)} cy={top + stringGap * 3.5} r={6} className="fb__inlay" />
          </>
        )}
        {Array.from({ length: frets + 1 }, (_, f) => (
          <line key={f} x1={lineX(f)} x2={lineX(f)} y1={top - 8} y2={top + stringGap * 5 + 8} className={f === 0 ? "fb__nut" : "fb__fret"} stroke={f === 0 ? undefined : `url(#traste-${id})`} />
        ))}
        {strings.map((s, row) => (
          <line
            key={s}
            x1={leftHanded ? 10 : openW}
            x2={leftHanded ? width - openW : width - 10}
            y1={top + row * stringGap}
            y2={top + row * stringGap}
            className={`fb__string ${s < 3 ? "is-wound" : ""}`}
            strokeWidth={0.9 + (5 - s) * 0.3}
          />
        ))}
        {capo > 0 && (
          <rect
            x={lineX(capo) + (leftHanded ? 6 : -14)}
            y={top - 12}
            width={8}
            height={stringGap * 5 + 24}
            rx={3}
            className="fb__capo"
          >
            <title>{`Cejilla en el traste ${capo}`}</title>
          </rect>
        )}
        {Array.from({ length: frets }, (_, i) => i + 1)
          .filter((f) => [3, 5, 7, 9, 12, 15].includes(f))
          .map((f) => (
            <text key={f} x={cx(f)} y={height - 6} className="fb__num" textAnchor="middle">
              {f}
            </text>
          ))}

        {strings.flatMap((s, row) =>
          Array.from({ length: frets + 1 }, (_, f) => {
            const pc = (TUNING[s] + f) % 12;
            if (!pcs.has(pc) || f < capo) return null;
            const inRange = !enPosicion || enPosicion.has(`${s}-${f}`);
            const isTonic = pc === tonicPc;
            const isChordTone = highlight.includes(pc);
            const text = fretLabels === "intervalos" ? intervalLabel(pc, tonicPc) : noteLabel(spell(pc, flats), notation);
            return (
              <g key={`${s}-${f}`} className={`fb__note ${isTonic ? "is-tonic" : isChordTone ? "is-chord" : ""} ${inRange ? "" : "is-out"}`}>
                <circle cx={cx(f)} cy={top + row * stringGap} r={11} />
                <text x={cx(f)} y={top + row * stringGap + 3.6} textAnchor="middle">
                  {text}
                </text>
              </g>
            );
          }),
        )}
      </svg>
    </div>
  );
}
