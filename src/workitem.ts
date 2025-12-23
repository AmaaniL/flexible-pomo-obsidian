import { TFile } from "obsidian";
import { PomoTaskItem } from "./pomo_task_item";
import { TaskRuntime } from "./task_runtime";


export class WorkItem {
    activeNote: TFile;
    initialPomoTaskItems: PomoTaskItem[];
    postPomoTaskItems: PomoTaskItem[];
    modifiedPomoTaskItems: PomoTaskItem[];
    isStartedActiveNote: boolean;
    runtimes: Map<PomoTaskItem, TaskRuntime>;
    activeRuntime: TaskRuntime | null;


    timedTasks: PomoTaskItem[];
    activeTask: PomoTaskItem | null;

    constructor(activeNote: TFile, isStartedActiveNote: boolean) {
        this.activeNote = activeNote;
        this.initialPomoTaskItems = [];
        this.postPomoTaskItems = [];
        this.modifiedPomoTaskItems = [];
        this.isStartedActiveNote = isStartedActiveNote;

        
        this.timedTasks = [];
        this.activeTask = null;
        this.runtimes = new Map();
        this.activeRuntime = null;

        
    }
    initializeTaskRuntimes() {
        this.runtimes.clear();

        this.initialPomoTaskItems
            .filter(task => task.estimatedMs !== undefined && !task.isCompleted)
            .forEach(task => {
                this.runtimes.set(task, new TaskRuntime(task));
            });
    }
}
