import { useEffect, useRef, useState } from "react";

/**
 * ✅ useCountUp
 * Smooth number count-up animation without external libraries.
 *
 * Fixes:
 * - avoids stale "val" dependency issue
 * - works correctly when target changes rapidly
 * - reduces unnecessary re-renders
 */
export default function useCountUp(target = 0, duration = 900, decimals = 0) {
  const [val, setVal] = useState(0);

  const raf = useRef(null);
  const startTime = useRef(0);

  const fromRef = useRef(0);
  const toRef = useRef(0);

  const lastEmittedRef = useRef(null);

  useEffect(() => {
    const to = Number(target || 0);
    if (!isFinite(to)) return;

    // cancel previous animation
    if (raf.current) cancelAnimationFrame(raf.current);

    // Start from current state value (safe)
    fromRef.current = Number(val || 0);
    toRef.current = to;

    startTime.current = performance.now();

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const round = (num) => {
      const p = Math.pow(10, decimals);
      return Math.round(num * p) / p;
    };

    const tick = (now) => {
      const elapsed = now - startTime.current;
      const t = Math.min(1, elapsed / Math.max(1, duration));
      const eased = easeOutCubic(t);

      const raw = fromRef.current + (toRef.current - fromRef.current) * eased;
      const next = round(raw);

      // ✅ Avoid spamming state updates with same value
      if (lastEmittedRef.current !== next) {
        lastEmittedRef.current = next;
        setVal(next);
      }

      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      }
    };

    raf.current = requestAnimationFrame(tick);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // ✅ include val so animation always starts from latest value
  }, [target, duration, decimals, val]);

  return val;
}
