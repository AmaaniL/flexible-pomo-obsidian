import { WorkItem } from "src/workbench/workitem";
import { TaskRuntime } from "./task_runtime";
import { PomoTaskItem } from "./pomo_task_item";
import { Timer } from "src/timer";
import { Notice } from "obsidian";
import { App } from "obsidian";
import { ExpirationModal } from "src/ui/modals/expiration_modal";

export class TaskTimeboxManager {
  private app: App;
  private workItem: WorkItem;
  private runtimes: Map<PomoTaskItem, TaskRuntime>;
  private activeRuntime: TaskRuntime | null;
  private timer: Timer;

  constructor(app: App, workItem: WorkItem, timer: Timer) {
    this.app = app;
    this.workItem = workItem;
    this.timer = timer;
    this.runtimes = workItem.runtimes;
    this.activeRuntime = null;
  }

  /** Initialize runtimes after parsing tasks */
  initialize() {
    this.workItem.initializeTaskRuntimes();
  }
  private canStartTask(task: PomoTaskItem): { ok: boolean; reason?: string } {
    if (task.isCompleted) {
      return { ok: false, reason: "Task is already completed" };
    }

    if (task.estimatedMs === undefined || task.estimatedMs <= 0) {
      return { ok: false, reason: "Task has no duration set" };
    }

    const runtime = this.runtimes.get(task);
    if (!runtime) {
      return { ok: false, reason: "Task runtime not initialized" };
    }

    return { ok: true };
  }

  /** Start or resume a task timebox */
  startTask(task: PomoTaskItem) {
    const check = this.canStartTask(task);
    if (!check.ok) {
      new Notice(check.reason);
      return;
    }

    const runtime = this.runtimes.get(task)!;

    if (this.activeRuntime && this.activeRuntime !== runtime) {
      this.pauseActiveTask();
    }

    this.activeRuntime = runtime;
    runtime.start();

    this.timer.startCountdown(runtime.remainingMs, () => {
      this.onActiveTaskExpired();
    });
  }

  /** Pause the currently active task */
  pauseActiveTask() {
    if (!this.activeRuntime) return;

    this.activeRuntime.pause();
    this.timer.quitTimer();
    this.activeRuntime = null;
  }

  /** Switch from the active task to another */
  switchTask(task: PomoTaskItem) {
    const check = this.canStartTask(task);
    if (!check.ok) {
      new Notice(check.reason);
      return;
    }

    this.pauseActiveTask();
    this.startTask(task);
  }

  /** Mark the active task as completed */
  completeActiveTask() {
    if (!this.activeRuntime) return;

    this.activeRuntime.pause();
    this.activeRuntime.completed = true;

    const completedTask = this.activeRuntime.task;
    this.activeRuntime = null;

    return completedTask;
  }

  /** Extend time for the active task */
  extendActiveTask(extraMs: number) {
    if (!this.activeRuntime) return;

    this.activeRuntime.remainingMs += extraMs;
    this.activeRuntime.estimatedMs =
      (this.activeRuntime.estimatedMs ?? 0) + extraMs;
  }

  /** Called periodically to check for expiration */
  checkExpiration(): boolean {
    if (!this.activeRuntime) return false;

    if (this.activeRuntime.remainingMs <= 0 && !this.activeRuntime.completed) {
      this.pauseActiveTask();
      return true;
    }
    return false;
  }

  /** Get all task runtimes (for UI) */
  getRuntimes(): TaskRuntime[] {
    return [...this.runtimes.values()];
  }

  /** Get active runtime */
  getActiveRuntime(): TaskRuntime | null {
    return this.activeRuntime;
  }
  private onActiveTaskExpired() {
    if (!this.activeRuntime) return;

    const runtime = this.activeRuntime;

    runtime.remainingMs = 0;
    this.pauseActiveTask();

    new Notice(`⏱ Task timebox finished: ${runtime.task.lineContent.trim()}`);

    new ExpirationModal(
      this.app,
      runtime,
      () => {
        runtime.completed = true;
      },
      (extraMs) => {
        runtime.remainingMs = extraMs;
        runtime.estimatedMs += extraMs;
        this.startTask(runtime.task);
      }
    ).open();
  }
}
