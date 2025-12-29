import { App, WorkspaceLeaf } from "obsidian";
import { WorkItem } from "./workbench/workitem";
import { TaskRuntime } from "./task_runtime";
import { ExpirationModal } from "./expiration_modal";
import { FilePersistence } from "./file_persistence";
import FlexiblePomoTimerPlugin from "./main";

export class TaskTimerPane {
  private plugin: FlexiblePomoTimerPlugin;
  private app: App;
  private leaf: WorkspaceLeaf;
  public workItem: WorkItem | null;

  private container: HTMLElement;
  private interval: number | null = null;
  private notifiedTasks = new Set<TaskRuntime>();

  constructor(
    plugin: FlexiblePomoTimerPlugin,
    parentEl: HTMLElement,
    workItem: WorkItem | null = null
  ) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.workItem = workItem;

    this.container = parentEl.createDiv({
      cls: "task-timer-pane",
    });

    this.interval = window.setInterval(() => this.render(), 1000);
  }

  /* ------------------------------ lifecycle ------------------------------ */

  public setWorkItem(workItem: WorkItem | null) {
    this.workItem = workItem;

    // ✅ Correct: reset expiration state when switching notes
    this.notifiedTasks.clear();

    this.render();
  }

  /* ----------------------------- helpers ----------------------------- */

  private formatTime(date: Date | null): string {
    if (!date) return "--:--";
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }

  private async persist() {
    if (!this.workItem) return;
    await new FilePersistence(this.app).updateWorkItemFile(this.workItem);
  }

  private autoComplete(runtime: TaskRuntime) {
    runtime.completed = true;
    runtime.remainingMs = 0;

    // ✅ mark as handled so it doesn't fire again
    this.notifiedTasks.add(runtime);

    void this.persist();
  }

  private openExpirationModal(runtime: TaskRuntime) {
    // ✅ mark immediately to prevent modal spam
    this.notifiedTasks.add(runtime);

    new ExpirationModal(
      this.app,
      runtime,
      async () => {
        runtime.completed = true;
        runtime.remainingMs = 0;
        await this.persist();
        this.render();
      },
      async (extraMs: number) => {
        runtime.remainingMs += extraMs;
        runtime.startedAt = Date.now();
        runtime.paused = false;

        // allow re-expiration after extension
        this.notifiedTasks.delete(runtime);

        await this.persist();
        this.render();
      }
    ).open();
  }

  /* ------------------------------ render ------------------------------ */

  public render() {
    this.container.empty();

    if (!this.workItem || !this.workItem.runtimes?.size) {
      this.container.setText("No tasks loaded yet...");
      return;
    }

    const runtimes = [...this.workItem.runtimes.values()];
    this.container.createEl("h4", { text: "Task Timer Pane" });

    let cumulativeMs = 0;
    let totalRemainingMs = 0;

    for (const runtime of runtimes) {
      const taskEl = this.container.createDiv({ cls: "task-timer-item" });

      const hasDuration =
        runtime.task.estimatedMs !== undefined && runtime.task.estimatedMs > 0;

      const remainingMs = hasDuration ? runtime.getDynamicRemaining() : 0;

      /* ---------- status ---------- */

      let status: string;

      if (!hasDuration) {
        status = "⛔ No duration set";
        taskEl.addClass("task-timer-item-ineligible");
      } else if (runtime.completed) {
        status = "✅ Completed";
      } else if (runtime.paused) {
        status = "⏸ Paused";
      } else {
        status = "▶ Active";
      }

      /* ---------- totals ---------- */
      // ✅ FIX: paused tasks should NOT affect finish-time math
      if (hasDuration && !runtime.completed && !runtime.paused) {
        cumulativeMs += remainingMs;
        totalRemainingMs += remainingMs;
      }

      /* ---------- styling ---------- */

      if (
        hasDuration &&
        this.plugin.settings.highlightActiveTask &&
        this.workItem.activeRuntime === runtime
      ) {
        taskEl.addClass("task-timer-item-active");
      }

      /* ---------- text ---------- */

      const remainingMin = Math.floor(remainingMs / 60000);
      const remainingSec = Math.floor((remainingMs % 60000) / 1000);

      let text = `${runtime.task.lineContent.trim()} — ${status}`;

      if (hasDuration) {
        text += ` — ${remainingMin}m ${remainingSec}s`;
      }

      if (
        hasDuration &&
        this.plugin.settings.showTaskFinishTime &&
        !runtime.completed &&
        !runtime.paused
      ) {
        const finishTime = new Date(Date.now() + cumulativeMs);
        text += ` — finish: ${this.formatTime(finishTime)}`;
      }

      taskEl.setText(text);

      /* ---------- expiration ---------- */
      // ✅ FIX: expiration fires once per runtime
      if (
        hasDuration &&
        !runtime.completed &&
        !runtime.paused &&
        remainingMs <= 0 &&
        !this.notifiedTasks.has(runtime)
      ) {
        if (this.plugin.settings.autoCompleteOnExpire) {
          this.autoComplete(runtime);
        } else {
          this.openExpirationModal(runtime);
        }
      }
    }

    /* ---------- totals footer ---------- */

    const totalMin = Math.floor(totalRemainingMs / 60000);
    const totalSec = Math.floor((totalRemainingMs % 60000) / 1000);

    this.container.createEl("div", {
      text: `Total Remaining: ${totalMin}m ${totalSec}s`,
    });

    const expectedFinish = new Date(Date.now() + totalRemainingMs);
    this.container.createEl("div", {
      text: `Expected Finish (eligible tasks): ${this.formatTime(
        expectedFinish
      )}`,
    });
  }

  /* ----------------------------- teardown ----------------------------- */

  public destroy() {
    if (this.interval) {
      window.clearInterval(this.interval);
      this.interval = null;
    }
    this.container.remove();
  }
}
