export function parseDurationFromText(text: string): number | undefined {
  const regex = /\b(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)\b|\b(\d+)\s*h\b/i;
  const match = text.match(regex);
  if (!match) return undefined;

  const hours = match[1] || match[3] ? parseInt(match[1] ?? match[3], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;

  const ms = (hours * 60 + minutes) * 60 * 1000;
  return ms > 0 ? ms : undefined;
}
