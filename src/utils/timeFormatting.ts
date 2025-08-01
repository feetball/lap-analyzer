/**
 * Utility functions for formatting race lap times
 */

/**
 * Format milliseconds to MM:SS.mmm format
 * @param timeInMs - Time in milliseconds
 * @returns Formatted time string (e.g., "1:23.456")
 */
export function formatLapTime(timeInMs: number): string {
  if (timeInMs < 0) return "0:00.000";
  
  const totalSeconds = Math.abs(timeInMs) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Format time difference with + or - prefix
 * @param timeDiffInMs - Time difference in milliseconds
 * @returns Formatted time difference (e.g., "+0:01.234" or "-0:00.567")
 */
export function formatTimeDifference(timeDiffInMs: number): string {
  const prefix = timeDiffInMs >= 0 ? '+' : '-';
  const formatted = formatLapTime(Math.abs(timeDiffInMs));
  return `${prefix}${formatted}`;
}

/**
 * Detect if time values are in seconds (typical range 60-300s) or milliseconds (60000-300000ms)
 * @param timeValues - Array of time values to analyze
 * @returns 'seconds' | 'milliseconds' | 'unknown'
 */
export function detectTimeUnit(timeValues: number[]): 'seconds' | 'milliseconds' | 'unknown' {
  if (timeValues.length === 0) return 'unknown';
  
  const avgTime = timeValues.reduce((sum, time) => sum + time, 0) / timeValues.length;
  
  // Typical lap times:
  // Seconds: 60-300 seconds (1-5 minutes)
  // Milliseconds: 60000-300000 ms (60-300 seconds)
  
  if (avgTime >= 60 && avgTime <= 600) {
    return 'seconds';
  } else if (avgTime >= 60000 && avgTime <= 600000) {
    return 'milliseconds';
  }
  
  return 'unknown';
}

/**
 * Convert time to milliseconds if needed
 * @param time - Time value
 * @param unit - Current unit of the time
 * @returns Time in milliseconds
 */
export function normalizeToMilliseconds(time: number, unit: 'seconds' | 'milliseconds' | 'unknown'): number {
  if (unit === 'seconds') {
    return time * 1000;
  }
  return time; // Already in milliseconds or unknown
}

/**
 * Format a time value, auto-detecting if it's in seconds or milliseconds
 * @param time - Time value
 * @param knownUnit - Known unit, or 'auto' to detect
 * @returns Formatted time string
 */
export function formatTimeAuto(time: number, knownUnit: 'seconds' | 'milliseconds' | 'auto' = 'auto'): string {
  let timeInMs = time;
  
  if (knownUnit === 'auto') {
    // Auto-detect based on typical lap time ranges
    if (time >= 60 && time <= 600) {
      // Likely seconds, convert to milliseconds
      timeInMs = time * 1000;
    }
    // Otherwise assume it's already in milliseconds
  } else if (knownUnit === 'seconds') {
    timeInMs = time * 1000;
  }
  
  return formatLapTime(timeInMs);
}
