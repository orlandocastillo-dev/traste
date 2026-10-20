import { useAppSelector } from "../app/hooks";
import { strum } from "../lib/audio";
import { chordLabel, chroma, parseChord } from "../lib/music";
import { baseFret, midiNotes, TUNING, voicingFor } from "../lib/voicings";

interface Props {
  /** Forma que se toca (con cejilla, la forma; sin cejilla, el acorde). */
  shape: string;
  /** Cejilla en el traste N: el sonido sube N semitonos. */
  capo?: number;
  size?: "sm" | "lg";
  active?: boolean;
  onPlay?: () => void;
}

const STRINGS = 6;
const FRETS = 5;

/** Diagrama de acorde en SVG, generado a partir de la posición. Clic para escucharlo. */
export function ChordDiagram({ shape, capo = 0, size = "sm", active, onPlay }: Props) {
  const notation = useAppSelector((s) => s.prefs.notation);
  const leftHanded = useAppSelector((s) => s.prefs.leftHanded);
  const voicing = voicingFor(shape);
  const label = chordLabel(shape, notation);

  if (!voicing) {
    return (
      <figure className={`chord chord--${size} chord--unknown`}>
        <figcaption className="chord__name">{label}</figcaption>
        <p className="chord__missing">Sin diagrama</p>
      </figure>
    );
  }

  const { frets, barre, simplified } = voicing;
  const start = baseFret(frets);
  const rootPc = chroma(parseChord(shape)?.root ?? "C");

  const w = 100;
  const h = 120;
  const left = 14;
  const top = 22;
  const gap = (w - left * 2) / (STRINGS - 1);
  const fretH = (h - top - 8) / FRETS;
  const xOf = (i: number) => left + (leftHanded ? STRINGS - 1 - i : i) * gap;

  const description = frets.map((f, i) => `cuerda ${6 - i}: ${f < 0 ? "no se toca" : f === 0 ? "al aire" : `traste ${f}`}`).join(", ");

  return (
    <figure className={`chord chord--${size} ${active ? "is-active" : ""}`}>
      <button
        type="button"
        className="chord__button"
        onClick={() => {
          strum(midiNotes(frets, capo));
          onPlay?.();
        }}
        aria-label={`${label}. ${description}. Tocar para escuchar.`}
      >
        <span className="chord__name">
          {label}
          {simplified && <span className="chord__simple" title="Versión simplificada">*</span>}
        </span>
        <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
          {/* Cejuela (si empieza en el traste 1) o número de traste inicial */}
          {start === 1 ? (
            <rect x={left - 1} y={top - 3} width={w - left * 2 + 2} height={4} rx={1} className="chord__nut" />
          ) : (
            <text x={leftHanded ? w - 4 : 3} y={top + fretH * 0.62} className="chord__fretnum" textAnchor={leftHanded ? "end" : "start"}>
              {start}
            </text>
          )}

          {Array.from({ length: FRETS + 1 }, (_, i) => (
            <line key={`f${i}`} x1={left} x2={w - left} y1={top + i * fretH} y2={top + i * fretH} className="chord__fret" />
          ))}
          {Array.from({ length: STRINGS }, (_, i) => (
            <line key={`s${i}`} x1={xOf(i)} x2={xOf(i)} y1={top} y2={top + FRETS * fretH} className="chord__string" />
          ))}

          {barre && barre >= start && (
            <rect
              x={left - 4}
              y={top + (barre - start + 0.5) * fretH - 4.5}
              width={w - left * 2 + 8}
              height={9}
              rx={4.5}
              className="chord__barre"
            />
          )}

          {frets.map((f, i) => {
            const x = xOf(i);
            if (f < 0) return <text key={i} x={x} y={top - 8} className="chord__mark" textAnchor="middle">×</text>;
            if (f === 0) return <circle key={i} cx={x} cy={top - 11} r={3.6} className="chord__open" />;
            const isRoot = (TUNING[i] + f) % 12 === rootPc;
            return <circle key={i} cx={x} cy={top + (f - start + 0.5) * fretH} r={5.4} className={isRoot ? "chord__dot chord__dot--root" : "chord__dot"} />;
          })}
        </svg>
      </button>
    </figure>
  );
}
