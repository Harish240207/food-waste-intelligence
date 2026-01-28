import { useEffect, useRef, useState } from "react";

/**
 * ✅ useFlashOnChange
 * Returns true for a short time whenever "value" changes.
 *
 * Upgrades:
 * - does NOT flash on first render
 * - stable for rapid updates
 * - clears previous timers safely
 */
export default function useFlashOnChange(value, ms = 650) {
  const [flash, setFlash] = useState(false);

  const prev = useRef(value);
  const mounted = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // ✅ skip first render (prevents unwanted flash on initial API load)
    if (!mounted.current) {
      mounted.current = true;
      prev.current = value;
      return;
    }

    // safe compare (works for number/string/null)
    const changed = String(prev.current) !== String(value);

    if (changed) {
      setFlash(true);

      // ✅ clear previous pending flash timer
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        setFlash(false);
      }, ms);

      prev.current = value;
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, ms]);

  return flash;
}
