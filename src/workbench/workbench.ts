import { TFile, WorkspaceLeaf } from "obsidian";

import FlexiblePomoTimerPlugin from "../main";
import { WorkbenchItemsListView } from "./workbench_view";
import {
  DEFAULT_DATA,
  defaultMaxLength,
  FilePath,
  WorkbenchItemsListViewType,
  WorkbenchFilesData,
} from "./workbench_data";
import { WorkItem } from "../workbench/workitem";
import { PomoTaskItem } from "../PomoTaskItem";
import { Mode } from "../timer";
import { CurrentProgressModal } from "../current_progress_modal";
import { TaskTimerPane } from "../task_timer_pane";
import { ItemView } from "obsidian";

export default class FlexiblePomoWorkbench {
  public data: WorkbenchFilesData;
  public view: WorkbenchItemsListView;
  public plugin: FlexiblePomoTimerPlugin;
  public leaf: WorkspaceLeaf;
  public modified: boolean;
  workItems: WorkItem[];
  public current_progress_modal: CurrentProgressModal;
  public taskTimerPane: TaskTimerPane | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    plugin: FlexiblePomoTimerPlugin,
    data: WorkbenchFilesData
  ) {
    this.leaf = leaf;
    this.plugin = plugin;
    this.data = data;
    this.workItems = new Array<WorkItem>();
    this.modified = false;
    this.current_progress_modal = new CurrentProgressModal(this.plugin);
  }

  public async unlinkItem(workItem: WorkItem) {
    await this.workItems.remove(workItem);
    let fileToRemove: FilePath;
    for (const workbenchFile of this.data.workbenchFiles) {
      if (workbenchFile.path === workItem.activeNote.path) {
        fileToRemove = workbenchFile;
        break;
      }
    }
    if (fileToRemove) {
      this.data.workbenchFiles.remove(fileToRemove);
    }
    await this.redraw();
  }

  public readonly pruneOmittedFiles = async (): Promise<void> => {
    this.data.workbenchFiles = this.data.workbenchFiles.filter(
      this.shouldAddFile
    );
    //await this.saveData();
  };

  public readonly pruneLength = async (): Promise<void> => {
    const toRemove =
      this.data.workbenchFiles.length -
      (this.data.maxLength || defaultMaxLength);
    if (toRemove > 0) {
      this.data.workbenchFiles.splice(
        this.data.workbenchFiles.length - toRemove,
        toRemove
      );
    }
    //await this.saveData();
  };

  public readonly shouldAddFile = (file: FilePath): boolean => {
    const patterns: string[] = this.data.omittedPaths.filter(
      (path) => path.length > 0
    );
    const fileMatchesRegex = (pattern: string): boolean => {
      try {
        return new RegExp(pattern).test(file.path);
      } catch (err) {
        console.error("Recent Files: Invalid regex pattern: " + pattern);
        return false;
      }
    };
    return !patterns.some(fileMatchesRegex);
  };
  public addWorkbenchItem(newWorkItem: WorkItem) {
    const existing = this.workItems.find(
      (wi) => wi.activeNote.path === newWorkItem.activeNote.path
    );
    if (existing) {
      existing.isStartedActiveNote = true;
    } else {
      this.workItems.push(newWorkItem);
    }

    // Update the TaskTimerPane with the first active WorkItem
    if (this.taskTimerPane) {
      this.taskTimerPane.setWorkItem(this.workItems[0] || null);
    }
  }
  public async initView(): Promise<void> {
    let leaf: WorkspaceLeaf | null = null;

    // Use an existing leaf if available
    for (const l of this.plugin.app.workspace.getLeavesOfType(
      WorkbenchItemsListViewType
    )) {
      if (l.view instanceof WorkbenchItemsListView) return;
      leaf = l;
      break;
    }

    // Otherwise get a leaf on left or right based on settings
    if (!leaf) {
      leaf =
        this.plugin.settings.workbench_location === "left"
          ? this.plugin.app.workspace.getLeftLeaf(false)
          : this.plugin.app.workspace.getRightLeaf(false);
    }

    await leaf.setViewState({
      type: WorkbenchItemsListViewType,
      active: true,
    });
    await this.plugin.app.workspace.revealLeaf(leaf);

    // Destroy old pane if exists
    if (this.taskTimerPane) this.taskTimerPane.destroy();

    // Create TaskTimerPane with null initially
    const itemView = leaf.view as ItemView;
    this.taskTimerPane = new TaskTimerPane(
      this.plugin,
      itemView.contentEl,
      null
    );

    // If any workItems exist, update pane
    if (this.workItems.length > 0) {
      this.taskTimerPane.setWorkItem(this.workItems[0]);
    }
  }

  public async linkFile(
    openedFile: TFile,
    initialWorkItems: PomoTaskItem[]
  ): Promise<void> {
    // Skip if already exists
    const existsInWorkbench = this.workItems.some(
      (wi) => wi.activeNote.path === openedFile.path
    );
    if (existsInWorkbench) return;

    // Create new WorkItem
    const newWorkItem = new WorkItem(openedFile, false);

    // Gather initial lines/tasks
    await this.plugin.parseUtility.gatherLineItems(
      newWorkItem,
      newWorkItem.initialPomoTaskItems,
      true,
      openedFile
    );

    if (initialWorkItems) {
      newWorkItem.initialPomoTaskItems = initialWorkItems;
    }

    // Add to workbench and update pane
    this.addWorkbenchItem(newWorkItem);

    // Redraw view
    this.redraw();
  }

  private isActive() {
    return (
      this.plugin.timer.mode === Mode.Pomo ||
      this.plugin.timer.mode === Mode.Stopwatch
    );
  }

  public clearWorkBench() {
    if (this.plugin.timer.isPomo() && this.plugin.timer.workItem) {
      // Keep only the active workItem
      const activePath = this.plugin.timer.workItem.activeNote.path;
      this.workItems = this.workItems.filter(
        (wi) => wi.activeNote.path === activePath
      );
      this.data.workbenchFiles = this.data.workbenchFiles.filter(
        (wf) => wf.path === activePath
      );
    } else {
      // Clear everything
      this.workItems = [];
      this.data.workbenchFiles = [];
    }

    // Update pane
    if (this.taskTimerPane) {
      this.taskTimerPane.setWorkItem(this.workItems[0] || null);
    }

    this.redraw();
  }

  shiftPositionDatafile(isMoveUp: boolean) {
    let index: number = 0;
    let hasMatch: boolean = false;
    for (const workbenchFile of this.data.workbenchFiles) {
      if (
        workbenchFile.path ===
        (this.plugin.app.workspace.getActiveFile()
          ? this.plugin.app.workspace.getActiveFile().path
          : this.plugin.getCurrentFile())
      ) {
        hasMatch = true;
        break;
      }
      index++;
    }
    if (isMoveUp) {
      if (hasMatch && index - 1 >= 0) {
        this.arrayMoveDatafile(this.data.workbenchFiles, index, index - 1);
        this.modified = true;
        this.redraw();
      }
    } else {
      if (hasMatch && index < this.data.workbenchFiles.length + 1) {
        this.arrayMoveDatafile(this.data.workbenchFiles, index, index + 1);
        this.modified = true;
        this.redraw();
      }
    }
  }

  shiftPositionWorkItem(isMoveUp: boolean) {
    let index: number = 0;
    let hasMatch: boolean = false;
    for (const workItem of this.workItems) {
      if (
        workItem.activeNote.path ===
        (this.plugin.app.workspace.getActiveFile()
          ? this.plugin.app.workspace.getActiveFile().path
          : this.plugin.getCurrentFile())
      ) {
        hasMatch = true;
        break;
      }
      index++;
    }
    if (isMoveUp) {
      if (hasMatch && index - 1 >= 0) {
        this.arrayMoveWorkItem(this.workItems, index, index - 1);
        this.modified = true;
        this.redraw();
      }
    } else {
      if (hasMatch && index < this.workItems.length + 1) {
        this.arrayMoveWorkItem(this.workItems, index, index + 1);
        this.modified = true;
        this.redraw();
      }
    }
  }

  arrayMoveDatafile(arr: Array<FilePath>, fromIndex: number, toIndex: number) {
    let element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
  }

  arrayMoveWorkItem(arr: Array<WorkItem>, fromIndex: number, toIndex: number) {
    let element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
  }

  redraw() {
    if (this.view) {
      this.view.redraw();
    }
  }
}
