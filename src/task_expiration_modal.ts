import { App, Modal, Setting, Notice } from "obsidian";
import { TaskRuntime } from "./task_runtime";

export class TaskExpirationModal extends Modal {
    runtime: TaskRuntime;
    onComplete: () => void;
    onExtend: (extraMs: number) => void;

    constructor(
        app: App,
        runtime: TaskRuntime,
        onComplete: () => void,
        onExtend: (extraMs: number) => void
    ) {
        super(app);
        this.runtime = runtime;
        this.onComplete = onComplete;
        this.onExtend = onExtend;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h3", {
            text: "Task timebox finished"
        });

        contentEl.createEl("p", {
            text: this.runtime.task.lineContent.trim()
        });

        new Setting(contentEl)
            .setName("What would you like to do?")
            .addButton(btn =>
                btn
                    .setButtonText("Complete task")
                    .setCta()
                    .onClick(() => {
                        this.onComplete();
                        this.close();
                    })
            )
            .addButton(btn =>
                btn
                    .setButtonText("Add time")
                    .onClick(() => {
                        this.openExtendPrompt();
                    })
            );
    }

    private openExtendPrompt() {
        const input = this.contentEl.createEl("input", {
            type: "number",
            placeholder: "Minutes to add"
        });

        input.focus();

        input.onkeydown = (e) => {
            if (e.key === "Enter") {
                const minutes = Number(input.value);
                if (minutes > 0) {
                    this.onExtend(minutes * 60 * 1000);
                    this.close();
                } else {
                    new Notice("Please enter a valid number of minutes");
                }
            }
        };
    }

    onClose() {
        this.contentEl.empty();
    }
}
