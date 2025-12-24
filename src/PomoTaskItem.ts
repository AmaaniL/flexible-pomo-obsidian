import { undefined } from "./pomo_task_item";

export class PomoTaskItem {
  lineContent: string;
  isCompleted: boolean;
  filePath: string;
  estimatedMs?: number;
  naturalLanguageDate?: Date;

  constructor(
    lineContent: string,
    isCompleted: boolean,
    filePath: string,
    estimatedMs?: number,
    naturalLanguageDate?: Date
  ) {
    this.lineContent = lineContent;
    this.isCompleted = isCompleted;
    this.filePath = filePath;
    this.estimatedMs = estimatedMs;
    this.naturalLanguageDate = naturalLanguageDate;
  }
  public parseDurationFromText(text: string): number | undefined {
    /**
     * Matches:
     *  - 10m
     *  - 1h
     *  - 1h30m
     *  - 2h 15m
     *  - ONLY when h/m units are present
     */
    const regex = /\b(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)\b|\b(\d+)\s*h\b/i;
    const match = text.match(regex);

    if (!match) return undefined;

    const hours = match[1] || match[3] ? parseInt(match[1] ?? match[3], 10) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;

    const ms = (hours * 60 + minutes) * 60 * 1000;
    return ms > 0 ? ms : undefined;
  }
}
