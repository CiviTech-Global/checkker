import { useState, useEffect } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Returns true when the user has enabled "Reduce Motion" in their device settings.
 * When true, animations should be simplified to simple fades or made instant.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced
    );
    return () => sub.remove();
  }, []);

  return reduced;
}
