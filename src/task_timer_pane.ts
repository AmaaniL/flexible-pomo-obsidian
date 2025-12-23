import { App, WorkspaceLeaf } from "obsidian";
import { WorkItem } from "./workitem";
import { TaskRuntime } from "./task_runtime";
import { ExpirationModal } from "./expiration_modal";

export class TaskTimerPane {
    private app: App;
    private leaf: WorkspaceLeaf;
    public workItem: WorkItem | null;
    private container: HTMLElement;
    private interval: number | null = null;
    private notifiedTasks: Set<TaskRuntime> = new Set();

    constructor(app: App, leaf: WorkspaceLeaf, workItem: WorkItem | null = null) {
        this.app = app;
        this.leaf = leaf;
        this.workItem = workItem;

        this.container = leaf.view.containerEl.createDiv({ cls: "task-timer-pane" });

        this.interval = window.setInterval(() => this.render(), 1000);
    }

    public setWorkItem(workItem: WorkItem | null) {
        this.workItem = workItem;
        this.notifiedTasks.clear();
        this.render();
    }

    private formatTime(date: Date | null): string {
        if (!date) return "--:--";
        return date.getHours().toString().padStart(2, "0") + ":" +
               date.getMinutes().toString().padStart(2, "0");
    }

    public render() {
        this.container.empty();

        if (!this.workItem || !this.workItem.runtimes || this.workItem.runtimes.size === 0) {
            this.container.setText("No tasks loaded yet...");
            return;
        }

        const runtimes = [...this.workItem.runtimes.values()];
        this.container.createEl("h4", { text: "Task Timer Pane" });

        let totalRemaining = 0;

        // Loop through tasks
        for (const runtime of runtimes) {
            const remainingMs = runtime.getDynamicRemaining();
            totalRemaining += remainingMs;

            const taskEl = this.container.createDiv({ cls: "task-timer-item" });
            const name = runtime.task.lineContent.trim();
            const status = runtime.completed ? "✅ Completed" : runtime.paused ? "⏸ Paused" : "▶ Active";

            const remainingMin = Math.floor(remainingMs / 60000);
            const remainingSec = Math.floor((remainingMs % 60000) / 1000);

            const finishTime = runtime.paused ? null : new Date(Date.now() + remainingMs);
            taskEl.setText(`${name} — ${status} — ${remainingMin}m ${remainingSec}s — finish: ${this.formatTime(finishTime)}`);

            // Handle expiration for multiple tasks
            if (!runtime.completed && !runtime.paused && remainingMs <= 0 && !this.notifiedTasks.has(runtime)) {
                this.notifiedTasks.add(runtime);

                new ExpirationModal(
                    this.app,
                    runtime,
                    // onComplete
                    () => {
                        runtime.completed = true;
                        runtime.remainingMs = 0;
                        this.render(); // update UI immediately
                    },
                    // onExtend
                    (extraMs: number) => {
                        runtime.remainingMs += extraMs;
                        runtime.startedAt = Date.now();
                        runtime.paused = false;
                        this.notifiedTasks.delete(runtime); // allow future notification if time expires again
                        this.render();
                    }
                ).open();
            }
        }

        const totalMin = Math.floor(totalRemaining / 60000);
        const totalSec = Math.floor((totalRemaining % 60000) / 1000);
        this.container.createEl("div", { text: `Total Remaining: ${totalMin}m ${totalSec}s` });

        const finishTimestamp = Date.now() + totalRemaining;
        this.container.createEl("div", { text: `Expected Finish: ${this.formatTime(new Date(finishTimestamp))}` });
    }

    public destroy() {
        if (this.interval) {
            window.clearInterval(this.interval);
            this.interval = null;
        }
        this.container.remove();
    }
}
