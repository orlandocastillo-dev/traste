import { useEffect, useRef, useState } from "react";

/**
 * Desplaza la página sola a la velocidad elegida, para tocar sin soltar la guitarra.
 * Se detiene al llegar al final o si el usuario desplaza con la mano hacia arriba.
 */
export function useAutoScroll() {
  const [on, setOn] = useState(false);
  const [speed, setSpeed] = useState(2);
  const carry = useRef(0);

  useEffect(() => {
    if (!on) return;
    let frame = 0;
    let last = performance.now();
    let lastY = window.scrollY;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (window.scrollY < lastY - 2) {
        setOn(false);
        return;
      }
      carry.current += dt * speed * 12;
      const step = Math.floor(carry.current);
      if (step > 0) {
        carry.current -= step;
        window.scrollBy(0, step);
      }
      lastY = window.scrollY;
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atEnd) {
        setOn(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [on, speed]);

  return { on, setOn, speed, setSpeed };
}
