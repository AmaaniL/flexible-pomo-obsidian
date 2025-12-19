import { TFile } from "obsidian";
import { PomoTaskItem } from "./pomo_task_item";

export class WorkItem {
    activeNote: TFile;
    initialPomoTaskItems: PomoTaskItem[];
    postPomoTaskItems: PomoTaskItem[];
    modifiedPomoTaskItems: PomoTaskItem[];
    isStartedActiveNote: boolean;

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
    }
}
