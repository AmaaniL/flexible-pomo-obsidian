import { TFile } from "obsidian";
import { PomoTaskItem } from "./pomo_task_item";
import { TaskRuntime } from "./task_runtime";

export class WorkItem {
    activeNote: TFile;
    initialPomoTaskItems: PomoTaskItem[];
    postPomoTaskItems: PomoTaskItem[];
    modifiedPomoTaskItems: PomoTaskItem[];
    isStartedActiveNote: boolean;

    // Runtime management
    runtimes: Map<PomoTaskItem, TaskRuntime>;
    activeRuntime: TaskRuntime | null;

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

    // Initialize runtimes for tasks with estimated time and not completed
    initializeTaskRuntimes() {
        this.runtimes.clear();

        this.initialPomoTaskItems
            .filter(task => task.estimatedMs !== undefined && !task.isCompleted)
            .forEach(task => {
                this.runtimes.set(task, new TaskRuntime(task));
            });
    }
}
