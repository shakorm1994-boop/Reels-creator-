/**
 * Formats time in seconds to mm:ss.ms or mm:ss
 */
export function formatTime(seconds: number, includeMs = false): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);

  const minsStr = mins.toString().padStart(2, '0');
  const secsStr = secs.toString().padStart(2, '0');

  if (includeMs) {
    return `${minsStr}:${secsStr}.${ms}`;
  }
  return `${minsStr}:${secsStr}`;
}

export function formatTimeRange(start: number, end: number): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return parseFloat(timeStr) || 0;
}
