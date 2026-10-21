import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "../app/hooks";
import { strum } from "../lib/audio";
import { chordLabel, romanNumeral } from "../lib/music";
import { midiNotes, TUNING, voicingFor, type Frets } from "../lib/voicings";

/** La progresión que se toca sola en la portada: I – V – vi – IV en Sol, la de mil canciones de alabanza. */
const PROGRESSION = ["G", "D", "Em", "C"];
const KEY = "G";
const STEP_MS = 2200;

const W = 780;
const H = 290;
const NUT = 190;
const TOP = 62;
const BOTTOM = 212;
const FRETS = 5;
/** Cada traste es un poco más corto que el anterior, como en una guitarra real. */
const FRET_X = (() => {
  const xs = [NUT];
  let len = 122;
  for (let i = 0; i < FRETS; i++) {
    xs.push(xs[i] + len);
    len *= 0.9439;
  }
  return xs;
})();
const END = W - 6;
/** De arriba hacia abajo: primera cuerda (Mi aguda) a sexta (Mi grave), como en las tablaturas. */
const STRING_Y = Array.from({ length: 6 }, (_, i) => TOP + (i * (BOTTOM - TOP)) / 5);
const STRING_WIDTH = [0.9, 1.2, 1.5, 1.9, 2.3, 2.8];

/** Clavijas: las tres cuerdas agudas van arriba y las tres graves abajo. */
const PEGS = [
  { x: 150, y: TOP - 30 },
  { x: 110, y: TOP - 33 },
  { x: 70, y: TOP - 34 },
  { x: 70, y: BOTTOM + 34 },
  { x: 110, y: BOTTOM + 33 },
  { x: 150, y: BOTTOM + 30 },
];

/** Índice de cuerda en la tablatura (0 = primera) a índice en el arreglo de trastes (0 = sexta). */
const fretIndex = (row: number) => 5 - row;

function fingerX(fret: number) {
  return (FRET_X[fret - 1] + FRET_X[fret]) / 2;
}

/**
 * Mástil de guitarra animado para la portada: recorre una progresión, mueve los dedos a cada acorde y
 * hace vibrar las cuerdas en el orden de un rasgueo. Al tocarlo suena el acorde.
 */
export function GuitarNeck() {
  const notation = useAppSelector((s) => s.prefs.notation);
  const leftHanded = useAppSelector((s) => s.prefs.leftHanded);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const strings = useRef<(SVGPathElement | null)[]>([]);
  const plucks = useRef<number[]>(Array(6).fill(-1));
  const wrap = useRef<HTMLDivElement>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const symbol = PROGRESSION[step];
  const frets = (voicingFor(symbol)?.frets ?? [-1, -1, -1, -1, -1, -1]) as Frets;

  // Vibración: cada cuerda es una curva cuya altura oscila y se apaga en menos de un segundo.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const tick = (now: number) => {
      STRING_Y.forEach((y, row) => {
        const path = strings.current[row];
        if (!path) return;
        const start = plucks.current[row];
        const t = start < 0 ? 99 : (now - start) / 1000;
        const amp = t > 1.2 ? 0 : 3.2 * Math.exp(-t * 4) * Math.sin(t * 2 * Math.PI * (16 + row * 2));
        path.setAttribute("d", `M ${NUT} ${y} Q ${(NUT + END) / 2} ${y + amp * 2} ${END} ${y}`);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const pluck = useCallback((rows: number[], spacing = 35) => {
    const now = performance.now();
    rows.forEach((row, i) => (plucks.current[row] = now + i * spacing));
  }, []);

  // Rasgueo hacia abajo: de la sexta cuerda a la primera, solo las que suenan en el acorde.
  const strumRows = useCallback((f: Frets) => [5, 4, 3, 2, 1, 0].filter((row) => f[fretIndex(row)] >= 0), []);

  // La progresión avanza sola mientras el mástil está a la vista.
  useEffect(() => {
    if (reduced || paused) return;
    const el = wrap.current;
    let visible = true;
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([e]) => (visible = e.isIntersecting)) : null;
    if (el && io) io.observe(el);
    const id = window.setInterval(() => visible && setStep((s) => (s + 1) % PROGRESSION.length), STEP_MS);
    return () => {
      window.clearInterval(id);
      io?.disconnect();
    };
  }, [reduced, paused]);

  // Cada cambio de acorde se ve como un rasgueo.
  useEffect(() => {
    const f = voicingFor(PROGRESSION[step])?.frets;
    if (f) pluck(strumRows(f));
  }, [step, pluck, strumRows]);

  const play = (i = step) => {
    const f = (voicingFor(PROGRESSION[i])?.frets ?? frets) as Frets;
    strum(midiNotes(f));
    pluck(strumRows(f));
  };

  const choose = (i: number) => {
    setPaused(true);
    setStep(i);
    play(i);
  };

  // Pasar el dedo (o el mouse) por las cuerdas las hace vibrar, sin sonido para no sorprender a nadie.
  const lastRow = useRef(-1);
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const y = ((e.clientY - box.top) / box.height) * H;
    const row = STRING_Y.findIndex((sy) => Math.abs(sy - y) < 9);
    if (row >= 0 && row !== lastRow.current) pluck([row], 0);
    lastRow.current = row;
  };

  return (
    <div className="neck" ref={wrap}>
      <div className="neck__head">
        <p className="neck__chord" aria-live="polite">
          {chordLabel(symbol, notation)}
          <span className="neck__roman">{romanNumeral(symbol, KEY)}</span>
        </p>
        <button type="button" className="neck__play" onClick={() => play()} aria-label={`Escuchar ${chordLabel(symbol, notation)}`}>
          ▶ Escuchar
        </button>
      </div>

      <svg
        className={`neck__svg ${leftHanded ? "is-left" : ""}`}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Mástil de guitarra con el acorde ${chordLabel(symbol, notation)}`}
        onPointerMove={onMove}
        onPointerLeave={() => (lastRow.current = -1)}
        onClick={() => play()}
      >
        {/* Clavijero: la cabeza de la guitarra con sus seis clavijas. */}
        <path
          className="neck__wood"
          d={`M ${NUT} ${TOP - 22} L 70 ${TOP - 40} Q 22 ${TOP - 42} 18 ${(TOP + BOTTOM) / 2} Q 22 ${BOTTOM + 42} 70 ${BOTTOM + 40} L ${NUT} ${BOTTOM + 22} Z`}
        />
        {STRING_Y.map((y, row) => (
          <line key={`h${row}`} className="neck__string" x1={NUT} y1={y} x2={PEGS[row].x} y2={PEGS[row].y} strokeWidth={STRING_WIDTH[row]} />
        ))}
        {PEGS.map((p, i) => (
          <g key={`p${i}`}>
            <rect className="neck__peg" x={p.x - 7} y={p.y < TOP ? p.y - 30 : p.y + 6} width="14" height="24" rx="5" />
            <circle className="neck__post" cx={p.x} cy={p.y} r="5" />
          </g>
        ))}
        <rect className="neck__wood" x={NUT - 6} y={TOP - 22} width={END - NUT + 6} height={BOTTOM - TOP + 44} />
        {[3, 5].map((f) => (
          <circle key={f} className="neck__inlay" cx={fingerX(f)} cy={(TOP + BOTTOM) / 2} r="7" />
        ))}
        <rect className="neck__nut" x={NUT - 7} y={TOP - 22} width="9" height={BOTTOM - TOP + 44} rx="2" />
        {FRET_X.slice(1).map((x) => (
          <rect key={x} className="neck__fret" x={x - 1.5} y={TOP - 22} width="3" height={BOTTOM - TOP + 44} />
        ))}
        {FRET_X.slice(1).map((x, i) => (
          <text key={`n${x}`} className="neck__fretnum" x={(FRET_X[i] + x) / 2} y={BOTTOM + 42} textAnchor="middle">
            {i + 1}
          </text>
        ))}
        {STRING_Y.map((y, row) => (
          <path
            key={row}
            ref={(el) => {
              strings.current[row] = el;
            }}
            className="neck__string"
            d={`M ${NUT} ${y} L ${END} ${y}`}
            strokeWidth={STRING_WIDTH[row]}
          />
        ))}
        {STRING_Y.map((y, row) => {
          const f = frets[fretIndex(row)];
          return (
            <text key={`o${row}`} className={`neck__open ${f < 0 ? "is-muted" : ""}`} x={NUT - 22} y={y + 5} textAnchor="middle">
              {f < 0 ? "×" : f === 0 ? "○" : ""}
            </text>
          );
        })}
        {STRING_Y.map((y, row) => {
          const f = frets[fretIndex(row)];
          if (f <= 0 || f > FRETS) return null;
          return (
            <g key={`d${row}`} className="neck__dot" style={{ transform: `translate(${fingerX(f)}px, ${y}px)` }}>
              <circle r="13" />
              <text y="5" textAnchor="middle">
                {chordLabel(noteAt(fretIndex(row), f), notation)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="neck__steps" role="group" aria-label="Acordes de la progresión">
        {PROGRESSION.map((c, i) => (
          <button key={c} type="button" aria-pressed={i === step} onClick={() => choose(i)}>
            <span>{chordLabel(c, notation)}</span>
            <small>{romanNumeral(c, KEY)}</small>
          </button>
        ))}
      </div>
      <p className="neck__hint">La progresión de mil canciones de alabanza. Toca un acorde para escucharlo.</p>
    </div>
  );
}

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
/** Nombre de la nota que suena en una cuerda y traste. */
function noteAt(stringIndex: number, fret: number) {
  return NOTES[(TUNING[stringIndex] + fret) % 12];
}
