import { useEffect, useRef } from 'react';
/**
 * A custom hook that sets up an interval that invokes the callback.
 * If delay is null, the interval is paused.
 *
 * @param callback The function to call at each interval
 * @param delay The delay in milliseconds, or null to pause
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  // Remember the latest callback if it changes.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  // Set up the interval.
  useEffect(() => {
    // Don't schedule if no delay is specified.
    // Note: 0 is a valid value for delay.
    if (delay === null) {
      return;
    }
    const id = setInterval(() => {
      savedCallback.current();
    }, delay);
    return () => clearInterval(id);
  }, [delay]);
}