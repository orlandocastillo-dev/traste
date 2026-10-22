// Sonido de guitarra con el algoritmo Karplus-Strong
let ctx: AudioContext | null = null;
const cache = new Map<number, AudioBuffer>();

function context(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Genera la muestra de una cuerda con el algoritmo Karplus-Strong
export function pluck(sampleRate: number, frequency: number, seconds = 2.2, damping = 0.996): Float32Array {
  const length = Math.floor(sampleRate * seconds);
  const period = Math.max(2, Math.round(sampleRate / frequency));
  const out = new Float32Array(length);
  for (let i = 0; i < period; i++) out[i] = Math.random() * 2 - 1;
  for (let i = period; i < length; i++) {
    out[i] = damping * 0.5 * (out[i - period] + out[i - period + 1]);
  }
  return out;
}

function bufferFor(ac: AudioContext, midi: number): AudioBuffer {
  const cached = cache.get(midi);
  if (cached) return cached;
  const data = pluck(ac.sampleRate, midiToFrequency(midi));
  const buffer = ac.createBuffer(1, data.length, ac.sampleRate);
  buffer.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
  cache.set(midi, buffer);
  return buffer;
}

function play(ac: AudioContext, midi: number, when: number, gain = 0.35) {
  const source = ac.createBufferSource();
  source.buffer = bufferFor(ac, midi);
  const volume = ac.createGain();
  volume.gain.value = gain;
  source.connect(volume).connect(ac.destination);
  source.start(when);
}

/** Rasgueo hacia abajo: cada cuerda suena unos milisegundos después de la anterior. */
export function strum(midiNotes: number[], spacing = 0.035) {
  const ac = context();
  if (!ac) return;
  const now = ac.currentTime + 0.02;
  midiNotes.forEach((n, i) => play(ac, n, now + i * spacing, 0.28));
}

/** Toca una escala nota por nota, subiendo. */
export function playSequence(midiNotes: number[], interval = 0.22) {
  const ac = context();
  if (!ac) return;
  const now = ac.currentTime + 0.02;
  midiNotes.forEach((n, i) => play(ac, n, now + i * interval, 0.4));
}
