import { App, TFile } from "obsidian";
import { WorkItem } from "./workitem";

export class FilePersistence {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async updateWorkItemFile(workItem: WorkItem): Promise<void> {
        const vault = this.app.vault; // use this.app
        const file = workItem.activeNote as TFile;

        const content = await vault.read(file);
        const lines = content.split("\n");

        const updatedLines = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]") || trimmed.startsWith("- [X]")) {
                const task = workItem.initialPomoTaskItems.find(
                    t => t.lineContent === trimmed.replace(/^- \[[ xX]\] /, "")
                );
                if (task) {
                    const runtime = workItem.runtimes.get(task);
                    if (runtime) {
                        const completedMark = runtime.completed ? "x" : " ";
                        return `- [${completedMark}] ${task.lineContent}`;
                    }
                }
            }
            return line;
        });

        await vault.modify(file, updatedLines.join("\n"));
    }
}
