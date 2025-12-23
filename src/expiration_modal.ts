import { App, Modal, Notice } from "obsidian";
import { TaskRuntime } from "./task_runtime";

export class ExpirationModal extends Modal {
    private runtime: TaskRuntime;
    private onComplete: () => void;
    private onExtend: (extraMs: number) => void;

    constructor(app: App, runtime: TaskRuntime, onComplete: () => void, onExtend: (extraMs: number) => void) {
        super(app);
        this.runtime = runtime;
        this.onComplete = onComplete;
        this.onExtend = onExtend;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h3", { text: "Task Time Finished!" });
        contentEl.createEl("p", { text: `Task: ${this.runtime.task.lineContent}` });

        const completeBtn = contentEl.createEl("button", { text: "Complete Task" });
        completeBtn.onclick = () => {
            this.onComplete();
            this.close();
            new Notice(`Task completed: ${this.runtime.task.lineContent}`);
        };

        const extendBtn = contentEl.createEl("button", { text: "Add 5 min" });
        extendBtn.onclick = () => {
            this.onExtend(5 * 60 * 1000); // extend by 5 minutes
            this.close();
            new Notice(`Added 5 min to task: ${this.runtime.task.lineContent}`);
        };

        const cancelBtn = contentEl.createEl("button", { text: "Cancel" });
        cancelBtn.onclick = () => this.close();
    }

    onClose() {
        this.contentEl.empty();
    }
}
