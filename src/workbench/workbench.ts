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
import { PomoTaskItem } from "../pomo_task_item";
import { Mode } from "../timer";
import { CurrentProgressModal } from "../current_progress_modal";
import { TASK_TIMER_VIEW_TYPE, TaskTimerPane } from "../task_timer_pane";
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

    // Update the TaskTimerPane only if it exists and WorkItem changed
    if (this.taskTimerPane) {
      const firstItem = this.workItems[0] || null;
      if (this.taskTimerPane.workItem !== firstItem) {
        this.taskTimerPane.setWorkItem(firstItem);
      }
    }
  }

  public async initView(): Promise<void> {
    let leaf: WorkspaceLeaf | null = null;

    // Try to reuse existing TaskTimerPane leaf
    const existingLeaves =
      this.plugin.app.workspace.getLeavesOfType(TASK_TIMER_VIEW_TYPE);

    if (existingLeaves.length > 0) {
      leaf = existingLeaves[0];
    } else {
      leaf =
        this.plugin.settings.workbench_location === "left"
          ? this.plugin.app.workspace.getLeftLeaf(false)
          : this.plugin.app.workspace.getRightLeaf(false);
    }

    await leaf.setViewState({
      type: TASK_TIMER_VIEW_TYPE,
      active: true,
    });

    await this.plugin.app.workspace.revealLeaf(leaf);

    const view = leaf.view;
    if (view instanceof TaskTimerPane) {
      this.taskTimerPane = view;

      if (this.workItems.length > 0) {
        view.setWorkItem(this.workItems[0]);
      }
    }
  }

  public async linkFile(
    openedFile: TFile,
    initialWorkItems?: PomoTaskItem[]
  ): Promise<void> {
    // Skip if already exists
    const existsInWorkbench = this.workItems.some(
      (wi) => wi.activeNote.path === openedFile.path
    );
    if (existsInWorkbench) return;

    // Create new WorkItem
    const newWorkItem = new WorkItem(openedFile, false);

    // Optionally set initial task items first
    if (initialWorkItems && initialWorkItems.length > 0) {
      newWorkItem.initialPomoTaskItems = initialWorkItems;
    }

    // Gather line items from the file and merge with initial tasks
    await this.plugin.parseUtility.gatherLineItems(
      newWorkItem,
      newWorkItem.initialPomoTaskItems,
      true,
      openedFile
    );

    // Initialize runtimes
    newWorkItem.initializeTaskRuntimes();

    console.log("[Workbench] WorkItem ready:", newWorkItem);
    console.log("[Workbench] Runtimes initialized:", newWorkItem.runtimes);

    // Add to workbench and update TaskTimerPane
    this.addWorkbenchItem(newWorkItem);

    // Redraw the workbench view
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
    if (
      this.taskTimerPane &&
      this.taskTimerPane.workItem !== this.workItems[0]
    ) {
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
