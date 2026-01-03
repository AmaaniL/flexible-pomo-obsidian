import { App, TFile, moment } from "obsidian";
import { TaskRuntime } from "src/core/tasks/task_runtime";

export class DayPlannerExporter {
  constructor(private app: App) {}

  async exportRuntime(runtime: TaskRuntime) {
    if (!runtime.startedAt || !runtime.estimatedMs) return;

    const start = moment(runtime.startedAt);
    const end = moment(runtime.startedAt + runtime.estimatedMs);

    const line = `- [ ] ${start.format("HH:mm")} - ${end.format("HH:mm")} ${
      runtime.task.lineContent
    }`;

    const dailyNote = await this.getTodayNote();
    if (!dailyNote) return;

    const contents = await this.app.vault.read(dailyNote);

    // Avoid duplicates
    if (contents.includes(line)) return;

    await this.app.vault.modify(
      dailyNote,
      contents.trimEnd() + "\n" + line + "\n"
    );
  }

  private async getTodayNote(): Promise<TFile | null> {
    const date = moment().format("YYYY-MM-DD");
    const dailyNotes = this.app.vault.getMarkdownFiles();

    return dailyNotes.find((f) => f.basename === date) ?? null;
  }
}
