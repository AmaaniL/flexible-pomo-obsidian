// utils/parseNaturalDate.ts
export function parseNaturalDate(text: string): Date | undefined {
  const parsed = window.moment(text, true);
  return parsed.isValid() ? parsed.toDate() : undefined;
}
