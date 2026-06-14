import { useEffect, useState } from "react";

/**
 * Live-ticking countdown anchored to the authoritative server clock.
 *
 * The server only sends `timeMs` on each move, so a clock that just renders
 * that prop sits frozen between turns. This hook keeps the *active* player's
 * clock visibly counting down and re-syncs the moment a fresh server value
 * arrives (or the turn flips). The inactive side always shows the exact
 * server value.
 */
export function useCountdown(timeMs: number, active: boolean, intervalMs = 250): number {
  const [display, setDisplay] = useState(timeMs);

  useEffect(() => {
    setDisplay(timeMs);
    if (!active) return;
    const anchorMs = timeMs;
    const anchorAt = Date.now();
    const id = setInterval(() => {
      setDisplay(Math.max(0, anchorMs - (Date.now() - anchorAt)));
    }, intervalMs);
    return () => clearInterval(id);
  }, [timeMs, active, intervalMs]);

  return display;
}
