import { App } from "obsidian";
import { TaskRuntime } from "src/core/tasks/task_runtime";
import { DayPlannerExporter } from "src/integrations/day_planner_exporter";
import { PomoTaskItem } from "src/core/tasks/pomo_task_item";

export class TimeboxInlineParser {
  private exporter: DayPlannerExporter;

  constructor(private app: App) {
    this.exporter = new DayPlannerExporter(app);
  }

  parseAndExport(line: string, filePath = ""): boolean {
    // ⛔ Skip Day Planner timeline entries
    if (/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/.test(line)) return false;

    // ⛔ Skip already processed lines
    if (line.includes("<!-- timeboxed -->")) return false;

    const task = new PomoTaskItem(
      line.trim(),
      false, // isCompleted
      filePath
    );

    const durationMs = task.parseDurationFromText(line);
    if (!durationMs) return false;

    const runtime = new TaskRuntime(task);
    runtime.startedAt = Date.now();
    runtime.estimatedMs = durationMs;

    this.exporter.exportRuntime(runtime);
    return true;
  }
}
