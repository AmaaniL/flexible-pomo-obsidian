import { App, TFile, moment } from "obsidian";

export class PomoLogManager {
  constructor(private app: App) {}

  private async getLogFile(): Promise<TFile | null> {
    const today = moment().format("YYYY-MM-DD");
    return (
      this.app.vault.getMarkdownFiles().find((f) => f.basename === today) ??
      null
    );
  }

  generateLogLine(text: string, start: moment.Moment, durationMs: number) {
    const end = start.clone().add(durationMs, "ms");
    return `- 🍅 ${start.format("HH:mm")}–${end.format("HH:mm")} ${text}`;
  }

  async addLog(taskText: string, start: moment.Moment, durationMs: number) {
    const file = await this.getLogFile();
    if (!file) return;

    const logLine = this.generateLogLine(taskText, start, durationMs);
    const content = await this.app.vault.read(file);

    if (content.includes(logLine)) return;

    await this.app.vault.modify(
      file,
      content.trimEnd() + "\n" + logLine + "\n"
    );
  }

  async removeLog(taskText: string, start: moment.Moment, durationMs: number) {
    const file = await this.getLogFile();
    if (!file) return;

    const logLine = this.generateLogLine(taskText, start, durationMs);
    const content = await this.app.vault.read(file);

    const updated = content
      .split("\n")
      .filter((l) => l !== logLine)
      .join("\n");

    await this.app.vault.modify(file, updated);
  }
}
