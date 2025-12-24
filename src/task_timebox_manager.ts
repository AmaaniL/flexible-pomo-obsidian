import { WorkItem } from "./workitem";
import { TaskRuntime } from "./task_runtime";
import { PomoTaskItem } from "./PomoTaskItem";
import { Timer } from "./timer";
import { Notice } from "obsidian";
import { TaskExpirationModal } from "./task_expiration_modal";
import { App } from "obsidian";

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

  /** Start or resume a task timebox */
  startTask(task: PomoTaskItem) {
    const runtime = this.runtimes.get(task);
    if (!runtime || runtime.completed) return;

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
    this.activeRuntime.estimatedMs += extraMs;
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

    new TaskExpirationModal(
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
