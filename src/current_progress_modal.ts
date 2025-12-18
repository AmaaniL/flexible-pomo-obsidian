import { Modal, TFile } from 'obsidian';
import FlexiblePomoTimerPlugin from './main';
import { WorkItem } from './workitem';

export class CurrentProgressModal extends Modal {
    private plugin: FlexiblePomoTimerPlugin;
    private mode: number;

    constructor(plugin: FlexiblePomoTimerPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    openProgressModal(mode: number) {
        this.mode = mode;
        this.open();
    }

    async onOpen() {
        super.onOpen();
        this.contentEl.empty();

        const container = this.contentEl.createDiv('ib');

        await this.postPomo(this.plugin.pomoWorkBench.workItems);

        for (const workItem of this.plugin.pomoWorkBench.workItems) {
            let tasksToShow;

            switch (this.mode) {
                case 0:
                    tasksToShow = workItem.modifiedPomoTaskItems;
                    break;
                case 1:
                    tasksToShow = workItem.postPomoTaskItems.filter(t => !t.isCompleted);
                    break;
                case 2:
                    tasksToShow = workItem.postPomoTaskItems;
                    break;
                case 3:
                    tasksToShow = workItem.postPomoTaskItems.filter(t => 
                        t.filePath === this.plugin.getCurrentFile()?.path && !t.isCompleted
                    );
                    break;
                case 4:
                    tasksToShow = workItem.postPomoTaskItems.filter(t => 
                        t.filePath === this.plugin.getCurrentFile()?.path
                    );
                    break;
                case 5:
                    tasksToShow = workItem.postPomoTaskItems;
                    workItem.hasActiveTask = tasksToShow.some(t => !t.isCompleted);
                    break;
                default:
                    tasksToShow = [];
            }

            if (this.mode === 5) {
                if (tasksToShow.length && workItem.hasActiveTask) {
                    container.createDiv({
                        text: `NOTE: ${workItem.activeNote.basename}\n`,
                    }).addClass('flexible-highlight-font');
                }
            } else if (tasksToShow.length) {
                container.createDiv({ text: `NOTE: ${workItem.activeNote.basename}\n` })
                    .addClass('flexible-highlight-font');

                const tasksContainer = container.createDiv('');
                for (const task of tasksToShow) {
                    tasksContainer.createDiv({
                        text: `  --> ${task.isCompleted ? '[X] ' : '[ ] '}- ${task.lineContent}`,
                    });
                }
                tasksContainer.createEl('br');
            }
        }
    }

    private async postPomo(workItems: WorkItem[]): Promise<void> {
        for (const item of workItems) {
            await this.plugin.parseUtility.gatherPostPomoTaskItems(item);
        }
    }

    onClose() {
        super.onClose();
    }
}
