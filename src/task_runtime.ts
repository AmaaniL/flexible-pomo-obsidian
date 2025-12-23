import { PomoTaskItem } from "./pomo_task_item";

export class TaskRuntime {
    task: PomoTaskItem;

    estimatedMs: number;
    remainingMs: number;

    startedAt: number | null;
    paused: boolean;
    completed: boolean;

    constructor(task: PomoTaskItem) {
        if (task.estimatedMs === undefined) {
            throw new Error("Cannot create TaskRuntime without estimatedMs");
        }

        this.task = task;
        this.estimatedMs = task.estimatedMs;
        this.remainingMs = task.estimatedMs;

        this.startedAt = null;
        this.paused = true;
        this.completed = false;
    }

    start() {
        if (!this.paused) return;
        this.startedAt = Date.now();
        this.paused = false;
    }

    pause() {
        if (this.paused || this.startedAt === null) return;
        const elapsed = Date.now() - this.startedAt;
        this.remainingMs = Math.max(0, this.remainingMs - elapsed);
        this.startedAt = null;
        this.paused = true;
    }

    reset(newEstimatedMs?: number) {
        if (newEstimatedMs !== undefined) {
            this.estimatedMs = newEstimatedMs;
        }
        this.remainingMs = this.estimatedMs;
        this.startedAt = null;
        this.paused = true;
    }

    isExpired(): boolean {
        return !this.paused && this.remainingMs <= 0;
    }
}
