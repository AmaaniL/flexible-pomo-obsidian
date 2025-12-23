import { WorkItem } from "./workitem";
import { TaskRuntime } from "./task_runtime";
import { PomoTaskItem } from "./pomo_task_item";
import { Timer } from "./timer";

export class TaskTimeboxManager {
    private workItem: WorkItem;
    private runtimes: Map<PomoTaskItem, TaskRuntime>;
    private activeRuntime: TaskRuntime | null;
    private timer: Timer;

    constructor(workItem: WorkItem, timer: Timer) {
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
    
        this.activeRuntime.remainingMs = 0;
    
        this.pauseActiveTask();
    

        console.log("Task timebox expired:", this.activeRuntime.task.lineContent);
    }
}
