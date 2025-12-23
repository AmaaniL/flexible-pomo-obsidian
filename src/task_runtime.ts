import { PomoTaskItem } from "./pomo_task_item";

export class TaskRuntime {
    task: PomoTaskItem;
    estimatedMs: number;
    remainingMs: number;
    startedAt: number | null;
    paused: boolean;
    completed: boolean;
    finishTimestamp: number | null; // added for finish-time estimation

    constructor(task: PomoTaskItem) {
        if (task.estimatedMs === undefined) {
            throw new Error("Cannot create TaskRuntime without estimatedMs");
        }
        this.task = task;
        this.estimatedMs = task.estimatedMs;
        this.remainingMs = this.estimatedMs;
        this.startedAt = null;
        this.paused = true;
        this.completed = false;
        this.finishTimestamp = null;
    }

    /** Get remaining milliseconds dynamically */
    getDynamicRemaining(): number {
        if (this.completed) return 0;
        if (this.paused || !this.startedAt) return this.remainingMs;
        return Math.max(this.remainingMs - (Date.now() - this.startedAt), 0);
    }

    /** Start or resume task */
    start() {
        if (!this.paused) return;
        this.startedAt = Date.now();
        this.paused = false;
        this.finishTimestamp = Date.now() + this.remainingMs;
    }

    /** Pause task */
    pause() {
        if (this.paused || this.startedAt === null) return;
        const elapsed = Date.now() - this.startedAt;
        this.remainingMs = Math.max(0, this.remainingMs - elapsed);
        this.startedAt = null;
        this.paused = true;
        this.finishTimestamp = null;
    }

    /** Reset task runtime (optionally with new estimated time) */
    reset(newEstimatedMs?: number) {
        if (newEstimatedMs !== undefined) {
            this.estimatedMs = newEstimatedMs;
        }
        this.remainingMs = this.estimatedMs;
        this.startedAt = null;
        this.paused = true;
        this.completed = false;
        this.finishTimestamp = null;
    }

    /** Check if the task is expired */
    isExpired(): boolean {
        return !this.paused && this.getDynamicRemaining() <= 0;
    }
}
