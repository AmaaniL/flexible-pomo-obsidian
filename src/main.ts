import * as feather from "feather-icons";
import { addIcon, Notice, Plugin, TAbstractFile, TFile } from "obsidian";
import { runWorkbenchTaskTimerTest } from "./debug";
import { FileUtility } from "./persistence/file_utility";
import { LoadingSuggester } from "./flexipomosuggesters/LoadingSuggester";
import { ParseUtility } from "./parsing/parse_utility";
import {
  DEFAULT_SETTINGS,
  PomoSettings,
  PomoSettingTab,
} from "./settings/settings";
import { SavingSuggester } from "./suggesters/SavingSuggester";
import { getDailyNoteFile, Mode, Timer } from "./timer";
import { askCustomTimeModal } from "./ui/modals/custom_time_modal";
import {
  TASK_TIMER_VIEW_TYPE,
  TaskTimerPane,
} from "./views/task_timer/task_timer_pane";
import { WorkbenchItemsListView } from "./views/workbench/workbench_view";
import FlexiblePomoWorkbench from "./workbench/workbench";
import {
  DEFAULT_DATA,
  WorkbenchItemsListViewType,
} from "./workbench/workbench_data";
import { WorkItem } from "./workbench/workitem";

export default class FlexiblePomoTimerPlugin extends Plugin {
  settings: PomoSettings;
  statusBar: HTMLElement;
  timer: Timer;
  pomoWorkBench: FlexiblePomoWorkbench;
  parseUtility: ParseUtility;
  saving_suggester: SavingSuggester;
  loading_suggester: LoadingSuggester;
  fileUtility: FileUtility;

  opened_file_path: string | null = null;
  lastOpenedFile: TFile | null = null;

  async onload() {
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async () => {
        await runWorkbenchTaskTimerTest(this);
      })
    );

    this.app.workspace.detachLeavesOfType(WorkbenchItemsListViewType);

    await this.loadSettings();
    this.addSettingTab(new PomoSettingTab(this.app, this));

    this.statusBar = this.addStatusBarItem();
    this.statusBar.addClass("statusbar-pomo");

    if (this.settings.logging) this.openLogFileOnClick();

    this.timer = new Timer(this);

    if (this.settings.ribbonIcon) {
      this.addRibbonIcon("clock", "Start Pomodoro", () => {
        const file = this.getCurrentFile();
        if (
          (this.settings.logActiveNote && file) ||
          !this.settings.logActiveNote
        ) {
          this.timer.onRibbonIconClick();
          this.pomoWorkBench.redraw();
          this.updateTaskTimerPane();

          if (this.pomoWorkBench) this.savePomoWorkBench();
        } else {
          new Notice("Please open an active note first.");
        }
      });
    }
    this.registerView(
      TASK_TIMER_VIEW_TYPE,
      (leaf) => new TaskTimerPane(leaf, this)
    );

    this.pomoWorkBench = new FlexiblePomoWorkbench(
      this.app.workspace.activeLeaf,
      this,
      DEFAULT_DATA
    );
    this.fileUtility = new FileUtility(this);
    this.saving_suggester = new SavingSuggester(this);
    this.loading_suggester = new LoadingSuggester(this);

    this.registerView(
      WorkbenchItemsListViewType,
      (leaf) =>
        (this.pomoWorkBench.view = new WorkbenchItemsListView(
          leaf,
          this,
          this.pomoWorkBench.data,
          this.pomoWorkBench
        ))
    );

    (this.app.workspace as any).registerHoverLinkSource(
      WorkbenchItemsListViewType,
      {
        display: "Pomo Workbench",
        defaultMod: true,
      }
    );

    if (this.app.workspace.layoutReady) await this.pomoWorkBench.initView();
    else
      this.registerEvent(
        this.app.workspace.on("quit", this.pomoWorkBench.initView)
      );

    this.registerInterval(
      window.setInterval(
        async () => this.statusBar.setText(await this.timer.setStatusBarText()),
        500
      )
    );

    // Feather icons
    addIcon("feather-play", feather.icons.play.toString());
    addIcon("feather-pause", feather.icons.pause.toString());
    addIcon(
      "feather-quit",
      feather.icons.x
        .toSvg({ viewBox: "0 0 24 24", width: "100", height: "100" })
        .toString()
    );
    addIcon("feather-headphones", feather.icons.headphones.toString());

    this.parseUtility = new ParseUtility(this);

    this.app.workspace.on("file-open", (file: TFile) => {
      if (file) this.lastOpenedFile = file;
      this.pomoWorkBench.redraw();
      this.updateTaskTimerPane();
    });

    this.registerEvent(this.app.vault.on("delete", this.handleDelete));
    this.registerEvent(this.app.vault.on("rename", this.handleRename));

    this.registerPomodoroCommands();
    this.registerView(
      TASK_TIMER_VIEW_TYPE,
      (leaf) => new TaskTimerPane(leaf, this)
    );
    this.addCommand({
      id: "show-task-timer-pane",
      name: "Show Task Timer Pane",
      callback: async () => {
        const leaf =
          this.app.workspace.getRightLeaf(false) ??
          this.app.workspace.getLeftLeaf(false);

        await leaf.setViewState({
          type: TASK_TIMER_VIEW_TYPE,
          active: true,
        });

        this.app.workspace.revealLeaf(leaf);
      },
    });
  }

  // --- Utilities ---
  public getCurrentFile(): TFile | null {
    return this.app.workspace.getActiveFile() || this.lastOpenedFile;
  }

  private isActive() {
    return (
      this.timer.mode === Mode.Pomo ||
      this.timer.mode === Mode.Stopwatch ||
      this.timer.mode === Mode.PomoCustom
    );
  }

  private isInactive() {
    return !this.isActive();
  }

  async savePomoWorkBench() {
    if (this.isInactive()) {
      this.pomoWorkBench.modified = false;
      this.pomoWorkBench.workItems = [];
      await this.extractWorkItems();
      const file = this.app.vault.getAbstractFileByPath(
        this.settings.active_workbench_path
      ) as TFile;
      this.fileUtility.handleAppend(file);
    } else {
      const file = this.app.vault.getAbstractFileByPath(
        this.settings.active_workbench_path
      ) as TFile;
      this.pomoWorkBench.modified = false;
      this.fileUtility.handleAppend(file);
    }
    this.pomoWorkBench.redraw();
    this.updateTaskTimerPane();
  }

  private async extractWorkItems() {
    for (const workBenchFile of this.pomoWorkBench.data.workbenchFiles) {
      const tFile: TFile = this.app.vault.getAbstractFileByPath(
        workBenchFile.path
      ) as TFile;
      const workItem = new WorkItem(tFile, true);
      await this.parseUtility.gatherLineItems(
        workItem,
        workItem.initialPomoTaskItems,
        true,
        workItem.activeNote
      );
    }
  }

  private unlinkFile(tFile: TFile) {
    if (this.isActive()) {
      const workItem = this.pomoWorkBench.workItems.find(
        (w) => w.activeNote.path === tFile.path
      );
      if (workItem) {
        this.pomoWorkBench.modified = true;
        this.pomoWorkBench.unlinkItem(workItem);
        new Notice("Unlinking Active Note From Workbench");
      }
    } else {
      const dataFile = this.pomoWorkBench.data.workbenchFiles.find(
        (f) => f.path === tFile.path
      );
      if (dataFile) {
        this.pomoWorkBench.modified = true;
        this.pomoWorkBench.data.workbenchFiles.remove(dataFile);
      }
      this.pomoWorkBench.redraw();
      this.updateTaskTimerPane();
    }
  }

  private readonly handleDelete = async (
    file: TAbstractFile
  ): Promise<void> => {
    const workbenchFile = this.pomoWorkBench.data.workbenchFiles.find(
      (f) => f.path === file.path
    );
    if (workbenchFile) this.unlinkFile(file as TFile);
  };

  private readonly handleRename = async (
    file: TAbstractFile,
    oldPath: string
  ): Promise<void> => {
    const workbenchFile = this.pomoWorkBench.data.workbenchFiles.find(
      (f) => f.path === oldPath
    );
    if (workbenchFile)
      this.pomoWorkBench.data.workbenchFiles.remove(workbenchFile);

    if (this.isActive()) {
      const workItem = this.pomoWorkBench.workItems.find(
        (w) => w.activeNote.path === oldPath
      );
      if (workItem) this.pomoWorkBench.workItems.remove(workItem);
    }

    if (workbenchFile) {
      this.pomoWorkBench.modified = true;
      if (this.getCurrentFile()?.path === file.path)
        this.lastOpenedFile = file as TFile;
      this.pomoWorkBench.linkFile(file as TFile, null);
    }

    this.pomoWorkBench.redraw();
    this.updateTaskTimerPane();
  };

  openLogFileOnClick() {
    this.statusBar.addClass("statusbar-pomo-logging");
    this.statusBar.onClickEvent(async () => {
      if (this.settings.logging) {
        try {
          const file = this.settings.logToDaily
            ? (await getDailyNoteFile()).path
            : this.settings.logFile;
          this.app.workspace.openLinkText(file, "", false);
        } catch {}
      }
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // --- Pomodoro Commands ---
  private registerPomodoroCommands() {
    // Start Pomodoro
    this.addCommand({
      id: "start-flexible-pomo",
      name: "Start Pomodoro",
      icon: "feather-play",
      checkCallback: (checking: boolean) => {
        if (this.settings.logActiveNote && !this.getCurrentFile()) return false;
        if (this.isInactive()) {
          if (!checking) {
            this.settings.lastUsedPomoType = "pomo";
            this.timer = new Timer(this);
            this.timer.triggered = false;
            this.showWorkbench();
            this.timer.startTimer(Mode.Pomo);
            this.savePomoWorkBench();
          }
          return true;
        }
        return false;
      },
    });

    // Start Custom Pomodoro
    this.addCommand({
      id: "start-flexible-pomo-custom-time",
      name: "Start Custom Pomodoro",
      icon: "feather-play",
      checkCallback: (checking: boolean) => {
        if (this.settings.logActiveNote && !this.getCurrentFile()) return false;
        if (this.isInactive()) {
          if (!checking) this.getAskCustomTimeModal();
          return true;
        }
        return false;
      },
    });

    // Start Last Custom Pomodoro
    this.addCommand({
      id: "start-flexible-last-custom-pomo",
      name: "Start Last Custom Pomodoro",
      icon: "feather-play",
      checkCallback: (checking: boolean) => {
        if (this.settings.logActiveNote && !this.getCurrentFile()) return false;
        if (this.isInactive()) {
          if (!checking) {
            this.settings.lastUsedPomoType = "pomo-custom";
            this.timer = new Timer(this);
            this.timer.triggered = false;
            this.showWorkbench();
            this.timer.startTimer(Mode.PomoCustom);
            this.savePomoWorkBench();
          }
          return true;
        }
        return false;
      },
    });

    // Start Stopwatch
    this.addCommand({
      id: "start-flexible-stopwatch",
      name: "Start Stopwatch",
      icon: "feather-play",
      checkCallback: (checking: boolean) => {
        if (this.settings.logActiveNote && !this.getCurrentFile()) return false;
        if (this.isInactive()) {
          if (!checking) {
            this.timer = new Timer(this);
            this.timer.triggered = false;
            this.timer.extendedTime = window.moment();
            this.showWorkbench();
            this.timer.startTimer(Mode.Stopwatch);
            this.savePomoWorkBench();
          }
          return true;
        }
        return false;
      },
    });

    // Early Logging & Quit
    this.addCommand({
      id: "log-and-quit-flexible-pomo",
      name: "Log Pomodoro Time and Quit",
      icon: "feather-quit",
      checkCallback: (checking: boolean) => {
        if (this.isActive() && this.settings.logging) {
          if (!checking) {
            this.timer.extendPomodoroTime = false;
            this.timer.triggered = false;
            this.timer.stopTimerEarly();
          }
          return true;
        }
        return false;
      },
    });

    // Short Break
    this.addCommand({
      id: "start-flexible-pomo-shortbreak",
      name: "Start Short Break",
      icon: "feather-play",
      checkCallback: (checking: boolean) => {
        if (this.timer.mode !== Mode.Stopwatch) {
          if (!checking) this.timer.startTimer(Mode.ShortBreak);
          return true;
        }
        return false;
      },
    });

    // Long Break
    this.addCommand({
      id: "start-flexible-pomo-longbreak",
      name: "Start Long Break",
      icon: "feather-play",
      checkCallback: (checking: boolean) => {
        if (this.timer.mode !== Mode.Stopwatch) {
          if (!checking) this.timer.startTimer(Mode.LongBreak);
          return true;
        }
        return false;
      },
    });

    // Toggle Pause
    this.addCommand({
      id: "pause-flexible-pomo",
      name: "Toggle Timer Pause",
      icon: "feather-pause",
      checkCallback: (checking: boolean) => {
        if (this.isInactive()) {
          if (!checking) this.timer.togglePause();
          return true;
        }
        return false;
      },
    });

    // Quit Timer/Stopwatch
    this.addCommand({
      id: "quit-flexible-pomo",
      name: "Quit Timer/Stopwatch",
      icon: "feather-quit",
      checkCallback: (checking: boolean) => {
        if (this.timer.mode !== Mode.NoTimer) {
          if (!checking) this.timer.quitTimer();
          return true;
        }
        return false;
      },
    });

    // Link File to Workbench
    this.addCommand({
      id: "link-file-pomoworkbench",
      name: "Link File To Active WorkBench",
      icon: "feather-add",
      checkCallback: (checking: boolean) => {
        if (!this.checkIfActive()) {
          if (!checking) {
            this.pomoWorkBench.linkFile(this.getCurrentFile(), null);
            this.savePomoWorkBench();
            this.showWorkbench();
            new Notice("Linking Active Note to Workbench");
          }
          return true;
        }
        return false;
      },
    });

    // Unlink File from Workbench
    this.addCommand({
      id: "unlink-file-pomoworkbench",
      name: "Unlink File From Active Workbench",
      icon: "feather-remove",
      checkCallback: (checking: boolean) => {
        if (
          this.isActive() &&
          !this.checkIfActiveTimerOn() &&
          this.checkIfActive()
        ) {
          if (!checking) this.unlinkFile(this.getCurrentFile());
          this.savePomoWorkBench();
          return true;
        }
        return false;
      },
    });

    // Show Workbench
    this.addCommand({
      id: "show-pomoworkbench",
      name: "Show Pomo Workbench",
      icon: "feather-show",
      callback: () => this.showWorkbench(),
    });

    // Toggle Workbench Location
    this.addCommand({
      id: "toggle-pomoworkbench-location",
      name: "Toggle Pomo Workbench Location",
      icon: "feather-show",
      checkCallback: (checking: boolean) => {
        if (this.pomoWorkBench.view && this.settings.workbench_location) {
          if (!checking) {
            this.settings.workbench_location =
              this.settings.workbench_location === "left" ? "right" : "left";
            this.app.workspace.detachLeavesOfType(WorkbenchItemsListViewType);
            this.showWorkbench();
            this.saveSettings();
          }
          return true;
        }
        return false;
      },
    });

    // Clear Workbench
    this.addCommand({
      id: "clear-pomoworkbench",
      name: "Clear Pomo Workbench",
      icon: "feather-clear",
      callback: () => this.pomoWorkBench.clearWorkBench(),
    });

    // Show Progress Modals
    for (let i = 0; i <= 5; i++) {
      this.addCommand({
        id: `show-current-progress-${i}`,
        name:
          i === 0
            ? "Show Current Progress"
            : i === 1
            ? "Show All Open Tasks"
            : i === 2
            ? "Show All Tasks"
            : i === 3
            ? "Show All Open Tasks Of Active Note"
            : i === 4
            ? "Show All Tasks Of Active Note"
            : "Show Notes With Active Tasks",
        icon: "feather-show",
        checkCallback: (checking: boolean) => {
          if (this.isActive()) {
            if (!checking)
              this.pomoWorkBench.current_progress_modal.openProgressModal(i);
            return true;
          }
          return false;
        },
      });
    }

    // Toggle White Noise
    this.addCommand({
      id: "toggle-flexible-pomo-white-noise",
      name: "Toggle White noise",
      icon: "feather-headphones",
      callback: () => {
        if (this.settings.whiteNoise) {
          this.settings.whiteNoise = false;
          this.timer.whiteNoisePlayer.stopWhiteNoise();
        } else {
          this.settings.whiteNoise = true;
          this.timer.whiteNoisePlayer.whiteNoise();
        }
      },
    });

    // Save / Load Workbench
    this.addCommand({
      id: "flexible-save-as-workbench",
      name: "Save Pomo Workbench As",
      callback: () => {
        this.pomoWorkBench.modified = false;
        this.saving_suggester.insert_template();
      },
    });

    this.addCommand({
      id: "flexible-save-workbench",
      name: "Save Pomo Workbench",
      checkCallback: (checking) => {
        if (this.settings.active_workbench_path && !checking)
          this.savePomoWorkBench();
        return true;
      },
    });

    this.addCommand({
      id: "flexible-load-workbench",
      name: "Load Pomo Workbench",
      checkCallback: (checking) => {
        if (this.isInactive() && !checking)
          this.loading_suggester.insert_template();
        return true;
      },
    });

    this.addCommand({
      id: "flexible-unload-workbench",
      name: "Unload Pomo Workbench",
      checkCallback: (checking) => {
        if (
          this.isInactive() &&
          this.settings.active_workbench &&
          this.settings.active_workbench_path
        ) {
          if (!checking) {
            this.settings.active_workbench_path = "";
            this.settings.active_workbench = "";
            this.pomoWorkBench.clearWorkBench();
            this.saveSettings();
            new Notice("Unloaded current Workbench.");
          }
          return true;
        }
        return false;
      },
    });
  }

  async getAskCustomTimeModal() {
    await askCustomTimeModal(this.app, "Please set your desired times.", this);
  }

  async showWorkbench() {
    const leaves = this.app.workspace.getLeavesOfType(
      WorkbenchItemsListViewType
    );
    if (leaves.length) {
      await this.app.workspace.revealLeaf(leaves[0]);
    } else {
      const leaf =
        this.settings.workbench_location === "left"
          ? await this.app.workspace.getLeftLeaf(false)
          : await this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({ type: WorkbenchItemsListViewType });
      await this.app.workspace.revealLeaf(leaf);
    }
  }

  private checkIfActive(): boolean {
    return !!this.pomoWorkBench?.data.workbenchFiles.some(
      (f) => f.path === this.getCurrentFile()?.path
    );
  }

  private checkIfActiveTimerOn(): boolean {
    return !!this.pomoWorkBench?.workItems.some(
      (w) =>
        w.activeNote.path === this.getCurrentFile()?.path &&
        w.isStartedActiveNote
    );
  }

  onunload() {
    try {
      this.timer.quitTimer();
    } catch {}
    (this.app.workspace as any).unregisterHoverLinkSource(
      WorkbenchItemsListViewType
    );
  }
  public updateTaskTimerPane() {
    const leaves = this.app.workspace.getLeavesOfType(TASK_TIMER_VIEW_TYPE);
    if (!leaves.length) return;

    // ✅ source of truth
    const activeWorkItem = this.timer?.workItem ?? null;

    for (const leaf of leaves) {
      const view = leaf.view;

      if (!(view instanceof TaskTimerPane)) {
        continue;
      }

      view.setWorkItem(activeWorkItem);
    }
  }
}
