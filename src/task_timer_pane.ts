import { WorkspaceLeaf, App } from "obsidian";
import { WorkItem } from "./workitem";
import { TaskRuntime } from "./task_runtime";

export class TaskTimerPane {
    private workItem: WorkItem;
    private container: HTMLElement;
    private interval: number | null = null;

    constructor(app: App, leaf: WorkspaceLeaf, workItem: WorkItem) {
        this.workItem = workItem;

        // create container inside leaf
        this.container = leaf.view.containerEl.createDiv({ cls: "task-timer-pane" });

        // initial render
        this.render();

        // start updating
        this.interval = window.setInterval(() => this.render(), 1000);
    }

    render() {
        // Clear previous content
        this.container.empty();

        const runtimes = [...this.workItem.runtimes.values()];

        // Header
        this.container.createEl("h4", { text: "Task Timer Pane" });

        // Task list
        runtimes.forEach(runtime => {
            const taskEl = this.container.createDiv({ cls: "task-timer-item" });
            const name = runtime.task.lineContent;
            let status = "";

            if (runtime.completed) {
                status = "✅ Completed";
            } else if (!runtime.paused) {
                status = "▶ Active";
            } else {
                status = "⏸ Paused";
            }

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
                const rem = rt.paused ? rt.remainingMs : Math.max(rt.remainingMs - (Date.now() - (rt.startedAt || 0)), 0);
                return acc + rem;
            }, 0);

        const totalMin = Math.floor(totalRemaining / 60000);
        const totalSec = Math.floor((totalRemaining % 60000) / 1000);

        this.container.createEl("div", { text: `Total Remaining: ${totalMin}m ${totalSec}s` });
    }

    destroy() {
        if (this.interval) {
            window.clearInterval(this.interval);
        }
        this.container.remove();
    }
}
