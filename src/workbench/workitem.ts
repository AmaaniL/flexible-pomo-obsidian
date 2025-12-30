import { TFile } from "obsidian";
import { PomoTaskItem } from "../PomoTaskItem";
import { TaskRuntime } from "../task_runtime";

export class WorkItem {
  activeNote: TFile;
  initialPomoTaskItems: PomoTaskItem[];
  postPomoTaskItems: PomoTaskItem[];
  modifiedPomoTaskItems: PomoTaskItem[];
  isStartedActiveNote: boolean;

  // Runtime management
  runtimes: Map<PomoTaskItem, TaskRuntime>;
  activeRuntime: TaskRuntime | null = null;

  // Task timer pane / active tasks
  timedTasks: PomoTaskItem[];
  activeTask: PomoTaskItem | null;
  hasActiveTask: boolean;

  constructor(activeNote: TFile, isStartedActiveNote: boolean) {
    this.activeNote = activeNote;
    this.initialPomoTaskItems = [];
    this.postPomoTaskItems = [];
    this.modifiedPomoTaskItems = [];
    this.isStartedActiveNote = isStartedActiveNote;

    this.timedTasks = [];
    this.activeTask = null;
    this.hasActiveTask = false;

    this.runtimes = new Map();
    this.activeRuntime = null;
  }

  /**
   * Initialize runtimes for all tasks with estimatedMs and not completed.
   * Also sets the first active runtime automatically.
   */
  initializeTaskRuntimes() {
    // Clear existing runtimes
    this.runtimes.clear();

    // Create new runtimes
    this.initialPomoTaskItems
      .filter((task) => task.estimatedMs !== undefined && !task.isCompleted)
      .forEach((task) => {
        this.runtimes.set(task, new TaskRuntime(task));
      });

    // Automatically set the first active runtime
    this.activeRuntime =
      [...this.runtimes.values()].find((rt) => !rt.completed) ?? null;
    this.activeTask = this.activeRuntime?.task ?? null;
    this.hasActiveTask = this.activeTask !== null;

    // Debug logs
    console.log("[DEBUG] Task items:", this.initialPomoTaskItems);
    this.initialPomoTaskItems.forEach((item) => {
      console.log(
        "[DEBUG] Runtime created for:",
        item.lineContent,
        item.estimatedMs
      );
    });
    console.log("[DEBUG] Active runtime:", this.activeRuntime);
  }
  getActiveRuntime(): TaskRuntime | null {
    return (
      this.activeRuntime ??
      [...this.runtimes.values()].find((rt) => !rt.completed) ??
      null
    );
  }

  pauseActiveRuntime() {
    if (this.activeRuntime) {
      this.activeRuntime.paused = true;
    }
  }

  setActiveRuntime(runtime: TaskRuntime) {
    this.activeRuntime = runtime;
  }
}
