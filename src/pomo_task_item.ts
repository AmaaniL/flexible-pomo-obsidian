export class PomoTaskItem {
    lineContent: string;
    isCompleted: boolean;
    filePath: string;

    // NEW
    estimatedMs?: number;

    constructor(lineContent: string, isCompleted: boolean, filePath: string) {
        this.lineContent = lineContent.trim();
        this.isCompleted = isCompleted;
        this.filePath = filePath;

        this.estimatedMs = this.parseDurationFromText(this.lineContent);
    }

    private parseDurationFromText(text: string): number | undefined {
        /**
         * Matches:
         *  - 10m
         *  - 1h
         *  - 1h30m
         *  - 2h 15m
         */
        const regex = /(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i;
        const match = text.match(regex);

        if (!match) return undefined;

        const hours = match[1] ? parseInt(match[1], 10) : 0;
        const minutes = match[2] ? parseInt(match[2], 10) : 0;

        const ms = (hours * 60 + minutes) * 60 * 1000;
        return ms > 0 ? ms : undefined;
    }
}
