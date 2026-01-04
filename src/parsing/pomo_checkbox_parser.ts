import { App, TFile } from "obsidian";
import moment from "moment";
import { PomoTaskItem } from "src/core/tasks/pomo_task_item";
import { PomoLogManager } from "src/logging/pomo_log_manager";

export class PomoCheckboxParser {
  constructor(private app: App, private logManager: PomoLogManager) {}

  async parseLine(line: string, file: TFile) {
    const checked = /^\s*-\s*\[x\]/i.test(line);
    const unchecked = /^\s*-\s*\[\s\]/.test(line);

    if (!checked && !unchecked) return;

    const task = new PomoTaskItem(line.trim(), false, file.path);
    const durationMs = task.parseDurationFromText(line);
    if (!durationMs) return;

    const timeMatch = line.match(/@(\d{1,2}:\d{2})/);
    if (!timeMatch) return;

    const start = moment(timeMatch[1], "HH:mm");
    const taskText = this.extractTaskText(line);

    if (checked && !line.includes("<!-- pomo-logged -->")) {
      await this.logManager.addLog(taskText, start, durationMs);
      await this.mark(file, line, "pomo-logged");
    }

    if (unchecked && line.includes("<!-- pomo-logged -->")) {
      await this.logManager.removeLog(taskText, start, durationMs);
      await this.unmark(file, line, "pomo-logged");
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Helpers                                                                   */
  /* ------------------------------------------------------------------------ */

  /**
   * Turns:
   * - [x] Write report section 1h30m @20:00 <!-- pomo-logged -->
   * Into:
   * Write report section
   */
  private extractTaskText(line: string): string {
    return (
      line
        // remove checkbox
        .replace(/^\s*-\s*\[[x\s]\]\s*/i, "")
        // remove time like @20:00
        .replace(/@\d{1,2}:\d{2}/g, "")
        // remove duration like 1h, 30m, 1h30m, 2h 15m
        .replace(/\b\d+\s*h\b/gi, "")
        .replace(/\b\d+\s*m\b/gi, "")
        // remove HTML comments
        .replace(/<!--.*?-->/g, "")
        // normalize whitespace
        .replace(/\s{2,}/g, " ")
        .trim()
    );
  }

  private async mark(file: TFile, line: string, tag: string) {
    const content = await this.app.vault.read(file);
    const updated = content.replace(line, `${line} <!-- ${tag} -->`);
    await this.app.vault.modify(file, updated);
  }

  private async unmark(file: TFile, line: string, tag: string) {
    const content = await this.app.vault.read(file);
    const updated = content
      .replace(`<!-- ${tag} -->`, "")
      .replace(/\s{2,}/g, " ")
      .trimEnd();
    await this.app.vault.modify(file, updated);
  }
}
