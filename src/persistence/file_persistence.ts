import { App, TFile } from "obsidian";
import { WorkItem } from "../workbench/work_item";
import { PomoTaskItem } from "../core/tasks/pomo_task_item";
export class FilePersistence {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  private formatMsToText(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const parts: string[] = [];
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    return parts.join("");
  }

  async updateWorkItemFile(workItem: WorkItem): Promise<void> {
    const file = workItem.activeNote as TFile;
    const vault = this.app.vault;

    const content = await vault.read(file);
    const lines = content.split("\n");

    const updatedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("- [ ]") ||
        trimmed.startsWith("- [x]") ||
        trimmed.startsWith("- [X]")
      ) {
        const rawText = trimmed.replace(/^-\s\[[ xX]\]\s*/, "");
        const task = workItem.initialPomoTaskItems.find(
          (t) => t.lineContent === rawText
        );
        if (task) {
          const runtime = workItem.runtimes.get(task);
          const completedMark = runtime?.completed ? "x" : " ";
          const durationText = task.estimatedMs
            ? ` ⏱ ${this.formatMsToText(task.estimatedMs)}`
            : "";
          return `- [${completedMark}] ${task.lineContent}${durationText}`;
        }
      }
      return line;
    });

    await vault.modify(file, updatedLines.join("\n"));
  }
}
