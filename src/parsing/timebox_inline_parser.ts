import { App, TFile } from "obsidian";
import moment from "moment";
import { TaskRuntime } from "src/core/tasks/task_runtime";
import { DayPlannerExporter } from "src/integrations/day_planner_exporter";
import { PomoTaskItem } from "src/core/tasks/pomo_task_item";

export class TimeboxInlineParser {
  private exporter: DayPlannerExporter;

  constructor(private app: App) {
    this.exporter = new DayPlannerExporter(app);
  }

  /**
   * Parses:
   * - [ ] Write report section 15m
   * - [ ] Write report section 15m @09:30
   *
   * Exports to Day Planner AND marks the line as processed.
   */
  async parseAndExport(line: string, file: TFile): Promise<boolean> {
    // ⛔ Skip already processed
    if (line.includes("<!-- timeboxed -->")) return false;

    // ⛔ Skip Day Planner timeline entries
    if (/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/.test(line)) return false;

    const task = new PomoTaskItem(line.trim(), false, file.path);

    const durationMs = task.parseDurationFromText(line);
    if (!durationMs) return false;

    /* ---------- Determine start time ---------- */

    // Inline @09:30 support
    const timeMatch = line.match(/@(\d{1,2}:\d{2})/);
    let startedAt: number;

    if (timeMatch) {
      startedAt = moment(timeMatch[1], "HH:mm").valueOf();
    } else {
      // Default: next 5-minute boundary
      const now = moment();
      now.minutes(Math.ceil(now.minutes() / 5) * 5).seconds(0);
      startedAt = now.valueOf();
    }

    /* ---------- Create runtime ---------- */

    const runtime = new TaskRuntime(task);
    runtime.startedAt = startedAt;
    runtime.estimatedMs = durationMs;

    await this.exporter.exportRuntime(runtime);

    /* ---------- Mark line as processed ---------- */

    await this.markLineAsTimeboxed(file, line);

    return true;
  }

  /* -------------------------------------------------------------------------- */

  private async markLineAsTimeboxed(file: TFile, originalLine: string) {
    const content = await this.app.vault.read(file);
    const updated = content
      .split("\n")
      .map((l) => (l === originalLine ? `${l} <!-- timeboxed -->` : l))
      .join("\n");

    await this.app.vault.modify(file, updated);
  }
}
