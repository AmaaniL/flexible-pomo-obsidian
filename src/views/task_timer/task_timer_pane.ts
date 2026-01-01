import { ItemView, WorkspaceLeaf } from "obsidian";
import { PomoTaskItem } from "../../core/tasks/pomo_task_item";
import { TaskRuntime } from "../../core/tasks/task_runtime";
import { ExpirationModal } from "../../expiration_modal";
import { FilePersistence } from "../../file_persistence";
import FlexiblePomoTimerPlugin from "../../main";
import { WorkItem } from "../../workbench/workitem";
export const TASK_TIMER_VIEW_TYPE = "flexible-pomo-task-timer";

export class TaskTimerPane extends ItemView {
  private plugin: FlexiblePomoTimerPlugin;

  public workItem: WorkItem | null = null;

  private container!: HTMLElement;
  private interval: number | null = null;
  private notifiedTasks = new Set<TaskRuntime>();
  private lastRenderedNull = false;

  constructor(leaf: WorkspaceLeaf, plugin: FlexiblePomoTimerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  /* ---------------- Obsidian view metadata ---------------- */

  getViewType(): string {
    return TASK_TIMER_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Task Timer";
  }

  /* ---------------- lifecycle ---------------- */

  async onOpen() {
    this.container = this.contentEl.createDiv({
      cls: "task-timer-pane",
    });

    this.interval = window.setInterval(() => this.render(), 1000);
    this.render();
  }

  async onClose() {
    this.destroy();
  }

  public destroy() {
    if (this.interval) {
      window.clearInterval(this.interval);
      this.interval = null;
    }
    this.contentEl.empty();
  }

  public setWorkItem(workItem: WorkItem | null) {
    this.workItem = workItem;
    this.notifiedTasks.clear();
    this.render();
  }

  /* ---------------- helpers ---------------- */

  public onTaskClicked(task: PomoTaskItem) {
    const runtime = this.workItem?.runtimes.get(task);
    if (!runtime) return;

    const timer = this.plugin.timer;

    // Prevent switching during breaks
    if (timer.isPomoBreak()) return;

    // Pause current runtime
    if (
      this.workItem?.activeRuntime &&
      !this.workItem.activeRuntime.completed
    ) {
      this.workItem.activeRuntime.pause();
    }

    // Switch runtime
    this.workItem?.setActiveRuntime(runtime);

    // Resume if timer running
    if (!timer.paused && !runtime.completed) {
      runtime.start();
    }

    this.render();
  }

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

  /* ---------------- render ---------------- */

  public render() {
    this.container.empty();

    if (!this.workItem || !this.workItem.runtimes?.size) {
      this.container.setText("No tasks loaded yet...");
      if (!this.lastRenderedNull) {
        console.log("[TaskTimerPane] Rendering null");
        this.lastRenderedNull = true;
      }
      return;
    }

    this.lastRenderedNull = false;

    const runtimes = [...this.workItem.runtimes.values()];
    this.container.createEl("h4", { text: "Task Timer Pane" });

    let cumulativeMs = 0;
    let totalRemainingMs = 0;

    for (const runtime of runtimes) {
      const taskEl = this.container.createDiv({ cls: "task-timer-item" });

      const hasDuration =
        runtime.task.estimatedMs !== undefined && runtime.task.estimatedMs > 0;
      const remainingMs = hasDuration ? runtime.getDynamicRemaining() : 0;

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

      if (hasDuration && !runtime.completed) {
        totalRemainingMs += remainingMs;
        if (!runtime.paused) cumulativeMs += remainingMs;
      }

      if (
        hasDuration &&
        this.plugin.settings.highlightActiveTask &&
        this.workItem.activeRuntime === runtime
      ) {
        taskEl.addClass("task-timer-item-active");
      }

      const remainingMin = Math.floor(remainingMs / 60000);
      const remainingSec = Math.floor((remainingMs % 60000) / 1000);

      let text = `${runtime.task.lineContent.trim()} — ${status}`;
      if (hasDuration) text += ` — ${remainingMin}m ${remainingSec}s`;

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
      taskEl.onclick = () => this.onTaskClicked(runtime.task);

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

    const totalMin = Math.floor(totalRemainingMs / 60000);
    const totalSec = Math.floor((totalRemainingMs % 60000) / 1000);

    this.container.createEl("div", {
      text: `Total Remaining (all eligible tasks): ${totalMin}m ${totalSec}s`,
    });

    this.container.createEl("div", {
      text: `Expected Finish (eligible tasks): ${this.formatTime(
        new Date(Date.now() + totalRemainingMs)
      )}`,
    });
  }
}
