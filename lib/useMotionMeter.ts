import { useCallback, useEffect, useRef, useState } from "react";
import { Accelerometer } from "expo-sensors";

/**
 * Shared accelerometer "movement meter" used by the Earthquake per-design test
 * (how much a structure shakes) and the Gracefulness movements (how smoothly a
 * hand moves). Both want the same thing: how far the phone's acceleration
 * deviates from a still 1g baseline while the meter runs.
 *
 * `live`  — current deviation (g), for the live readout.
 * `peak`  — largest deviation seen since the last reset (g). Lower = steadier.
 * `getRms()` — root-mean-square deviation over the run (g). Lower = smoother.
 */
export function useMotionMeter(intervalMs = 100) {
  const [live, setLive] = useState(0);
  const [peak, setPeak] = useState(0);
  const [running, setRunning] = useState(false);

  const sub = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const peakRef = useRef(0);
  const sumSqRef = useRef(0);
  const countRef = useRef(0);

  const stop = useCallback(() => {
    sub.current?.remove();
    sub.current = null;
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    if (sub.current) return;
    Accelerometer.setUpdateInterval(intervalMs);
    sub.current = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const deviation = Math.abs(magnitude - 1); // strip the ~1g gravity baseline
      setLive(deviation);
      if (deviation > peakRef.current) {
        peakRef.current = deviation;
        setPeak(deviation);
      }
      sumSqRef.current += deviation * deviation;
      countRef.current += 1;
    });
    setRunning(true);
  }, [intervalMs]);

  const reset = useCallback(() => {
    peakRef.current = 0;
    sumSqRef.current = 0;
    countRef.current = 0;
    setLive(0);
    setPeak(0);
  }, []);

  /** RMS deviation over the run so far (g). Read after stop() to score a trial. */
  const getRms = useCallback(() => {
    return countRef.current > 0 ? Math.sqrt(sumSqRef.current / countRef.current) : 0;
  }, []);

  useEffect(() => {
    return () => {
      sub.current?.remove();
      sub.current = null;
    };
  }, []);

  return { live, peak, running, start, stop, reset, getRms };
}
