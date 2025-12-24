import { App, WorkspaceLeaf } from "obsidian";
import { WorkItem } from "./workitem";
import { TaskRuntime } from "./task_runtime";
import { ExpirationModal } from "./expiration_modal";
import { FilePersistence } from "./file_persistence";
import FlexiblePomoTimerPlugin from "./main";

export class TaskTimerPane {
  private app: App;
  private plugin: FlexiblePomoTimerPlugin;
  private leaf: WorkspaceLeaf;
  public workItem: WorkItem | null;
  private container: HTMLElement;
  private interval: number | null = null;
  private notifiedTasks: Set<TaskRuntime> = new Set();

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

  private formatTime(date: Date | null): string {
    if (!date) return "--:--";
    return (
      date.getHours().toString().padStart(2, "0") +
      ":" +
      date.getMinutes().toString().padStart(2, "0")
    );
  }

  public render() {
    this.container.empty();

    if (
      !this.workItem ||
      !this.workItem.runtimes ||
      this.workItem.runtimes.size === 0
    ) {
      this.container.setText("No tasks loaded yet...");
      return;
    }

    const runtimes = [...this.workItem.runtimes.values()];
    this.container.createEl("h4", { text: "Task Timer Pane" });

    let totalRemaining = 0;
    let cumulativeMs = 0; // for finish-time estimation

    // Loop through tasks
    for (const runtime of runtimes) {
      const remainingMs = runtime.getDynamicRemaining();
      totalRemaining += remainingMs;

      const taskEl = this.container.createDiv({ cls: "task-timer-item" });
      if (
        this.plugin.settings.highlightActiveTask &&
        this.workItem?.activeRuntime === runtime
      ) {
        taskEl.addClass("task-timer-item-active");
      }
      const name = runtime.task.lineContent.trim();
      const status = runtime.completed
        ? "✅ Completed"
        : runtime.paused
        ? "⏸ Paused"
        : "▶ Active";

      const remainingMin = Math.floor(remainingMs / 60000);
      const remainingSec = Math.floor((remainingMs % 60000) / 1000);

      // Calculate expected finish time for this task considering previous tasks
      const taskFinishTime = runtime.paused
        ? null
        : new Date(Date.now() + cumulativeMs + remainingMs);
      cumulativeMs += remainingMs;

      let text = `${name} — ${status} — ${remainingMin}m ${remainingSec}s`;

      if (this.plugin.settings.showTaskFinishTime) {
        text += ` — finish: ${this.formatTime(taskFinishTime)}`;
      }

      taskEl.setText(text);

      // Handle expiration for multiple tasks
      if (
        !runtime.completed &&
        !runtime.paused &&
        remainingMs <= 0 &&
        !this.notifiedTasks.has(runtime)
      ) {
        // Auto-complete path
        if (this.plugin.settings.autoCompleteOnExpire) {
          runtime.completed = true;
          runtime.remainingMs = 0;
          this.notifiedTasks.add(runtime);

          // Persist asynchronously (DO NOT await in render)
          if (this.workItem) {
            void new FilePersistence(this.app).updateWorkItemFile(
              this.workItem
            );
          }

          // continue rendering other tasks
          continue;
        }

        // Manual path → show modal
        this.notifiedTasks.add(runtime);

        new ExpirationModal(
          this.app,
          runtime,
          async () => {
            runtime.completed = true;
            runtime.remainingMs = 0;

            if (this.workItem) {
              await new FilePersistence(this.app).updateWorkItemFile(
                this.workItem
              );
            }

            this.render();
          },
          async (extraMs: number) => {
            runtime.remainingMs += extraMs;
            runtime.startedAt = Date.now();
            runtime.paused = false;
            this.notifiedTasks.delete(runtime);

            if (this.workItem) {
              await new FilePersistence(this.app).updateWorkItemFile(
                this.workItem
              );
            }

            this.render();
          }
        ).open();
      }
    }

    // Total remaining time
    const totalMin = Math.floor(totalRemaining / 60000);
    const totalSec = Math.floor((totalRemaining % 60000) / 1000);
    this.container.createEl("div", {
      text: `Total Remaining: ${totalMin}m ${totalSec}s`,
    });

    // Expected finish for all tasks
    const totalFinishTime = new Date(Date.now() + cumulativeMs);
    this.container.createEl("div", {
      text: `Expected Finish (all tasks): ${this.formatTime(totalFinishTime)}`,
    });
  }
  public destroy() {
    if (this.interval) {
      window.clearInterval(this.interval);
      this.interval = null;
    }
    this.container.remove();
  }
}
