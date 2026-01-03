import { PomoTaskItem } from "../core/tasks/pomo_task_item";
import FlexiblePomoTimerPlugin from "../main";
import { WorkItem } from "../workbench/work_item";
import { TFile } from "obsidian";
import { parseDurationFromText } from "src/utils/obsidian_files";

export class ParseUtility {
  plugin: FlexiblePomoTimerPlugin;

  constructor(plugin: FlexiblePomoTimerPlugin) {
    this.plugin = plugin;
  }

  /** Parse natural language date using Obsidian's moment parser */
  private parseNaturalDate(text: string): Date | undefined {
    const parsed = window.moment(text, true);
    return parsed.isValid() ? parsed.toDate() : undefined;
  }

  /** Gather tasks after pomodoro session */
  async gatherPostPomoTaskItems(workItem: WorkItem) {
    const activeFileContent = await this.plugin.app.vault.read(
      workItem.activeNote
    );

    // Reset arrays
    workItem.postPomoTaskItems = [];
    workItem.modifiedPomoTaskItems = [];

    activeFileContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("- [ ]") ||
        trimmed.startsWith("- [x]") ||
        trimmed.startsWith("- [X]")
      ) {
        const isCompleted =
          trimmed.startsWith("- [x]") || trimmed.startsWith("- [X]");
        const rawText = trimmed.replace(/^-\s\[[ xX]\]\s*/, "");

        workItem.postPomoTaskItems.push(
          new PomoTaskItem(rawText, isCompleted, workItem.activeNote.path)
        );
      }
    });

    // Find modified tasks
    workItem.postPomoTaskItems.forEach((task) => {
      if (
        !workItem.initialPomoTaskItems.some(
          (initial) =>
            task.lineContent === initial.lineContent &&
            task.isCompleted === initial.isCompleted
        )
      ) {
        workItem.modifiedPomoTaskItems.push(task);
      }
    });
  }

  /** Gather all line items for the workbench */
  async gatherLineItems(
    newWorkItem: WorkItem,
    pomoTaskItems: PomoTaskItem[],
    isStore: boolean,
    activeFile: TFile
  ) {
    const activeFileContent = await this.plugin.app.vault.read(activeFile);
    this.processActiveFileContents(
      activeFileContent,
      pomoTaskItems,
      isStore,
      newWorkItem
    );
  }

  /** Core task parsing */
  private processActiveFileContents(
    activeFileContent: string,
    pomoTaskItems: PomoTaskItem[],
    isStore: boolean,
    newWorkItem: WorkItem
  ) {
    activeFileContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("- [ ]") ||
        trimmed.startsWith("- [x]") ||
        trimmed.startsWith("- [X]")
      ) {
        const isCompleted =
          trimmed.startsWith("- [x]") || trimmed.startsWith("- [X]");
        const rawText = trimmed.replace(/^-\s\[[ xX]\]\s*/, "");

        // Parse duration if present
        const estimatedMs = parseDurationFromText(rawText);

        // Parse natural language date (optional)
        const naturalLanguageDate = this.parseNaturalDate(rawText);

        // Add task to list
        pomoTaskItems.push(
          new PomoTaskItem(
            rawText,
            isCompleted,
            newWorkItem.activeNote.path,
            estimatedMs,
            naturalLanguageDate
          )
        );
      }
    });

    if (isStore) {
      this.plugin.pomoWorkBench.addWorkbenchItem(newWorkItem);
    }
  }
}
