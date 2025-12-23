import { App, WorkspaceLeaf } from "obsidian";
import { WorkItem } from "./workitem";
import { TaskRuntime } from "./task_runtime";

export class TaskTimerPane {
    private app: App;
    private leaf: WorkspaceLeaf;
    public workItem: WorkItem | null;
    private container: HTMLElement;
    private interval: number | null = null;

    constructor(app: App, leaf: WorkspaceLeaf, workItem: WorkItem | null = null) {
        this.app = app;
        this.leaf = leaf;
        this.workItem = workItem;

        this.container = leaf.view.containerEl.createDiv({ cls: "task-timer-pane" });

        // start updating
        this.interval = window.setInterval(() => this.render(), 1000);
    }

    /** Set or change the active WorkItem dynamically */
    public setWorkItem(workItem: WorkItem | null) {
        this.workItem = workItem;
        this.render();
    }

    /** Render the pane */
    public render() {
        // clear container
        this.container.empty();

        if (!this.workItem || !this.workItem.runtimes || this.workItem.runtimes.size === 0) {
            this.container.setText("No tasks loaded yet...");
            return;
        }

        const runtimes = [...this.workItem.runtimes.values()];

        // Header
        this.container.createEl("h4", { text: "Task Timer Pane" });

        // Task list
        runtimes.forEach(runtime => {
            const taskEl = this.container.createDiv({ cls: "task-timer-item" });
            const name = runtime.task.lineContent.trim();
            let status = runtime.completed ? "✅ Completed" : runtime.paused ? "⏸ Paused" : "▶ Active";

            const remainingMs = runtime.paused
                ? runtime.remainingMs
                : Math.max(runtime.remainingMs - (Date.now() - (runtime.startedAt || 0)), 0);

            const remainingMin = Math.floor(remainingMs / 60000);
            const remainingSec = Math.floor((remainingMs % 60000) / 1000);

            taskEl.setText(`${name} — ${status} — ${remainingMin}m ${remainingSec}s`);
        });

        // Total remaining time
        const totalRemaining = runtimes
            .filter(rt => !rt.completed)
            .reduce((acc, rt) => {
                const rem = rt.paused
                    ? rt.remainingMs
                    : Math.max(rt.remainingMs - (Date.now() - (rt.startedAt || 0)), 0);
                return acc + rem;
            }, 0);

        const totalMin = Math.floor(totalRemaining / 60000);
        const totalSec = Math.floor((totalRemaining % 60000) / 1000);

        this.container.createEl("div", { text: `Total Remaining: ${totalMin}m ${totalSec}s` });
    }

    /** Stop interval and remove DOM element */
    public destroy() {
        if (this.interval) {
            window.clearInterval(this.interval);
            this.interval = null;
        }
        this.container.remove();
    }
}
