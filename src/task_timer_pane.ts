import { App, WorkspaceLeaf } from "obsidian";
import { WorkItem } from "./workitem";
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
    leaf: WorkspaceLeaf,
    workItem: WorkItem | null = null
  ) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.leaf = leaf;
    this.workItem = workItem;

    this.container = leaf.view.containerEl.createDiv({
      cls: "task-timer-pane",
    });

    this.interval = window.setInterval(() => this.render(), 1000);
  }

  public setWorkItem(workItem: WorkItem | null) {
    this.workItem = workItem;
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
    this.notifiedTasks.add(runtime);

    // fire-and-forget persistence
    void this.persist();
  }

  private openExpirationModal(runtime: TaskRuntime) {
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
      const remainingMs = runtime.getDynamicRemaining();
      if (!runtime.completed) {
        cumulativeMs += remainingMs;
        totalRemainingMs += remainingMs;
      }

      const taskEl = this.container.createDiv({ cls: "task-timer-item" });

      if (
        this.plugin.settings.highlightActiveTask &&
        this.workItem.activeRuntime === runtime
      ) {
        taskEl.addClass("task-timer-item-active");
      }

      const status = runtime.completed
        ? "✅ Completed"
        : runtime.paused
        ? "⏸ Paused"
        : "▶ Active";

      const remainingMin = Math.floor(remainingMs / 60000);
      const remainingSec = Math.floor((remainingMs % 60000) / 1000);

      const finishTime =
        runtime.paused || runtime.completed
          ? null
          : new Date(Date.now() + cumulativeMs);

      let text = `${runtime.task.lineContent.trim()} — ${status} — ${remainingMin}m ${remainingSec}s`;

      if (this.plugin.settings.showTaskFinishTime) {
        text += ` — finish: ${this.formatTime(finishTime)}`;
      }

      taskEl.setText(text);

      // Expiration handling
      if (
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

    const totalMin = Math.floor(totalRemainingMs / 60000);
    const totalSec = Math.floor((totalRemainingMs % 60000) / 1000);

    this.container.createEl("div", {
      text: `Total Remaining: ${totalMin}m ${totalSec}s`,
    });

    const expectedFinish = new Date(Date.now() + totalRemainingMs);
    this.container.createEl("div", {
      text: `Expected Finish (all tasks): ${this.formatTime(expectedFinish)}`,
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
