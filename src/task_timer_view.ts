import { ItemView, WorkspaceLeaf } from "obsidian";
import FlexiblePomoTimerPlugin from "./main";
import { TaskTimerPane } from "./task_timer_pane";

export const TASK_TIMER_VIEW_TYPE = "flexible-pomo-task-timer";

export class TaskTimerView extends ItemView {
  private plugin: FlexiblePomoTimerPlugin;
  private pane: TaskTimerPane | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: FlexiblePomoTimerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return TASK_TIMER_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Task Timer";
  }

  async onOpen() {
    const workItem = this.plugin.pomoWorkBench?.workItems?.[0] ?? null;

    this.pane = new TaskTimerPane(this.plugin, this.leaf, workItem);
  }

  async onClose() {
    this.pane?.destroy();
    this.pane = null;
  }

  setWorkItem(workItem: any) {
    this.pane?.setWorkItem(workItem);
  }
}
