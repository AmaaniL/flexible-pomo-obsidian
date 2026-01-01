import {
  App,
  DropdownComponent,
  Notice,
  PluginSettingTab,
  SearchComponent,
  Setting,
} from "obsidian";
import { appHasDailyNotesPluginLoaded } from "obsidian-daily-notes-interface";
import { whiteNoiseUrl } from "../audio/audio_urls";
import FlexiblePomoTimerPlugin from "../main";
import { WhiteNoise } from "../audio/white_noise";
import { FolderSuggest } from "../suggesters/FolderSuggester";
import { WorkbenchItemsListViewType } from "../workbench/workbench_data";

export interface PomoSettings {
  pomo: number;
  shortBreak: number;
  longBreak: number;
  pomoCustom: number;
  customShortBreak: number;
  customLongBreak: number;
  lastUsedPomoType: string;
  longBreakInterval: number;
  autostartTimer: boolean;
  numAutoCycles: number;
  ribbonIcon: boolean;
  notificationSound: boolean;
  backgroundNoiseFile: string;
  logging: boolean;
  logFile: string;
  logText: string;
  logToDaily: boolean;
  logActiveNote: boolean;
  logPomodoroDuration: boolean;
  logPomodoroTasks: boolean;
  fancyStatusBar: boolean;
  whiteNoise: boolean;
  showActiveNoteInTimer: boolean;
  allowExtendedPomodoro: boolean;
  betterIndicator: boolean;
  templates_folder: string;
  active_workbench: string;
  active_workbench_path: string;
  workbench_location: string;
  showTaskFinishTime: boolean;
  autoCompleteOnExpire: boolean;
  highlightActiveTask: boolean;
}

export const DEFAULT_SETTINGS: PomoSettings = {
  pomo: 25,
  shortBreak: 5,
  longBreak: 15,
  pomoCustom: 25,
  customShortBreak: 5,
  customLongBreak: 15,
  longBreakInterval: 4,
  lastUsedPomoType: "pomo",
  autostartTimer: true,
  numAutoCycles: 0,
  ribbonIcon: true,
  notificationSound: true,
  backgroundNoiseFile: "",
  logging: false,
  logFile: "Pomodoro Log.md",
  logToDaily: false,
  logText: "[🍅] dddd, MMMM DD YYYY, h:mm A",
  logActiveNote: false,
  logPomodoroDuration: false,
  logPomodoroTasks: false,
  fancyStatusBar: false,
  whiteNoise: false,
  showActiveNoteInTimer: false,
  allowExtendedPomodoro: false,
  betterIndicator: false,
  templates_folder: "",
  active_workbench: "",
  active_workbench_path: "",
  workbench_location: "right",
  showTaskFinishTime: true,
  autoCompleteOnExpire: false,
  highlightActiveTask: true,
};

export class PomoSettingTab extends PluginSettingTab {
  plugin: FlexiblePomoTimerPlugin;

  constructor(app: App, plugin: FlexiblePomoTimerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Flexible Pomodoro Timer - Settings" });

    /************** Timer settings **************/
    const createNumericSetting = (
      name: string,
      desc: string,
      value: number,
      defaultValue: number,
      onChange: (val: number) => void
    ) => {
      new Setting(containerEl)
        .setName(name)
        .setDesc(desc)
        .addText((text) =>
          text
            .setValue(value.toString())
            .onChange((val) =>
              onChange(setNumericValue(val, defaultValue, value))
            )
        );
    };

    createNumericSetting(
      "Pomodoro time (minutes)",
      "Leave blank for default",
      this.plugin.settings.pomo,
      DEFAULT_SETTINGS.pomo,
      (val) => {
        this.plugin.settings.pomo = val;
        this.plugin.saveSettings();
      }
    );

    createNumericSetting(
      "Short break time (minutes)",
      "Leave blank for default",
      this.plugin.settings.shortBreak,
      DEFAULT_SETTINGS.shortBreak,
      (val) => {
        this.plugin.settings.shortBreak = val;
        this.plugin.saveSettings();
      }
    );

    createNumericSetting(
      "Long break time (minutes)",
      "Leave blank for default",
      this.plugin.settings.longBreak,
      DEFAULT_SETTINGS.longBreak,
      (val) => {
        this.plugin.settings.longBreak = val;
        this.plugin.saveSettings();
      }
    );

    createNumericSetting(
      "Long break interval",
      "Number of pomos before a long break; leave blank for default",
      this.plugin.settings.longBreakInterval,
      DEFAULT_SETTINGS.longBreakInterval,
      (val) => {
        this.plugin.settings.longBreakInterval = val;
        this.plugin.saveSettings();
      }
    );

    new Setting(containerEl)
      .setName("Sidebar icon")
      .setDesc(
        "Toggle left sidebar icon. Restart Obsidian for change to take effect"
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.ribbonIcon).onChange((val) => {
          this.plugin.settings.ribbonIcon = val;
          this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Autostart timer")
      .setDesc("Start each pomodoro and break automatically.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autostartTimer).onChange((val) => {
          this.plugin.settings.autostartTimer = val;
          this.plugin.saveSettings();
          this.display(); // force refresh for dependent settings
        })
      );

    if (!this.plugin.settings.autostartTimer) {
      createNumericSetting(
        "Cycles before pause",
        "Number of pomodoro + break cycles to run automatically before stopping",
        this.plugin.settings.numAutoCycles,
        DEFAULT_SETTINGS.numAutoCycles,
        (val) => {
          this.plugin.settings.numAutoCycles = val;
          this.plugin.timer.cyclesSinceLastAutoStop = 0;
          this.plugin.saveSettings();
        }
      );
    }

    containerEl.createEl("h3", { text: "Task Timeboxing" });

    new Setting(containerEl)
      .setName("Show task finish times")
      .setDesc(
        "Display expected finish time for each task in the Task Timer Pane"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showTaskFinishTime)
          .onChange(async (val) => {
            this.plugin.settings.showTaskFinishTime = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto-complete task on expiration")
      .setDesc("Automatically complete a task when its timer expires")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoCompleteOnExpire)
          .onChange(async (val) => {
            this.plugin.settings.autoCompleteOnExpire = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Highlight active task")
      .setDesc("Visually highlight the currently active task")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.highlightActiveTask)
          .onChange(async (val) => {
            this.plugin.settings.highlightActiveTask = val;
            await this.plugin.saveSettings();
          })
      );

    /************** Sound settings **************/
    new Setting(containerEl)
      .setName("Notification sound")
      .setDesc("Play notification sound at the end of each pomodoro and break")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.notificationSound)
          .onChange((val) => {
            this.plugin.settings.notificationSound = val;
            this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("White noise")
      .setDesc("Play white noise while timer is active")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.whiteNoise).onChange((val) => {
          this.plugin.settings.whiteNoise = val;
          this.plugin.saveSettings();

          if (val) {
            this.plugin.timer.whiteNoisePlayer = new WhiteNoise(
              this.plugin,
              whiteNoiseUrl
            );
            this.plugin.timer.whiteNoisePlayer.whiteNoise();
          } else {
            this.plugin.timer.whiteNoisePlayer.stopWhiteNoise();
          }

          this.display();
        })
      );

    // ------------------ Workbench folder ------------------
    new Setting(this.containerEl)
      .setName("Workbench Folder location")
      .setDesc("Files in this folder will be available as workbenches.")
      .addSearch((cb: SearchComponent) => {
        new FolderSuggest(this.app, cb.inputEl); // attach folder suggester
        cb.setPlaceholder("Example: folder1/folder2")
          .setValue(this.plugin.settings.templates_folder)
          .onChange((new_folder: string) => {
            this.plugin.settings.templates_folder = new_folder;
            this.plugin.saveSettings();
          });
      })
      // Add class to the Setting container, not the SearchComponent
      .settingEl.addClass("flexible-pomo-search");

    // ------------------ Workbench position ------------------
    new Setting(containerEl)
      .setName("Workbench Position")
      .setDesc("Workbench Position in Workspace")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("left", "Left")
          .addOption("right", "Right")
          .setValue(this.plugin.settings.workbench_location)
          .onChange((val) => {
            const oldValue = this.plugin.settings.workbench_location;
            this.plugin.settings.workbench_location = val;
            this.plugin.saveSettings();
            if (val !== oldValue && this.plugin.pomoWorkBench.view) {
              this.app.workspace.detachLeavesOfType(WorkbenchItemsListViewType);
              this.plugin.pomoWorkBench.initView();
            }
          });
      });

    /************** Logging settings **************/
    new Setting(containerEl)
      .setName("Logging")
      .setDesc("Enable a log of completed pomodoros")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.logging).onChange((val) => {
          this.plugin.settings.logging = val;
          this.plugin.saveSettings();
          if (val) this.plugin.openLogFileOnClick();
          else this.plugin.statusBar.removeClass("statusbar-pomo-logging");
          this.display();
        })
      );

    if (this.plugin.settings.logging) {
      new Setting(containerEl)
        .setName("Log file")
        .setDesc("If file doesn't exist, it will be created")
        .addText((text) =>
          text.setValue(this.plugin.settings.logFile).onChange((val) => {
            this.plugin.settings.logFile = val;
            this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName("Log to daily note")
        .setDesc("Logs to the end of today's daily note")
        .addToggle((toggle) =>
          toggle.setValue(this.plugin.settings.logToDaily).onChange((val) => {
            if (val && !appHasDailyNotesPluginLoaded()) {
              new Notice("Please enable daily notes plugin");
              this.plugin.settings.logToDaily = false;
            } else {
              this.plugin.settings.logToDaily = val;
            }
            this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName("Timestamp Format")
        .setDesc("Specify format for the logtext using moment syntax")
        .addMomentFormat((text) =>
          text
            .setDefaultFormat(this.plugin.settings.logText)
            .onChange((val) => {
              this.plugin.settings.logText = val;
              this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Log active note")
        .setDesc(
          "Append link pointing to the note active when pomodoro started"
        )
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.logActiveNote)
            .onChange((val) => {
              this.plugin.settings.logActiveNote = val;
              this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Log pomodoro duration")
        .setDesc("Log pomodoro duration in minutes")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.logPomodoroDuration)
            .onChange((val) => {
              this.plugin.settings.logPomodoroDuration = val;
              this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Log completed tasks of Active Note")
        .setDesc("Log completed tasks of Active Note")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.logPomodoroTasks)
            .onChange((val) => {
              this.plugin.settings.logPomodoroTasks = val;
              this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Show active note in status bar")
        .setDesc("Show active note that pomodoro was started in")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.showActiveNoteInTimer)
            .onChange((val) => {
              this.plugin.settings.showActiveNoteInTimer = val;
              this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Allow extended Pomodoro")
        .setDesc("Allow Extended Pomodoro")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.allowExtendedPomodoro)
            .onChange((val) => {
              this.plugin.settings.allowExtendedPomodoro = val;
              this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Allow Popup Indicator")
        .setDesc("Allow Popup Pomodoro Indicator")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.betterIndicator)
            .onChange((val) => {
              this.plugin.settings.betterIndicator = val;
              this.plugin.saveSettings();
            })
        );
    }
  }
}

//sets the setting for the given to value if it's a valid, default if empty, otherwise sends user error notice
function setNumericValue(
  value: string,
  defaultSetting: number,
  currentSetting: number
) {
  if (value === "") {
    //empty string -> reset to default
    return defaultSetting;
  } else if (!isNaN(Number(value)) && Number(value) > 0) {
    //if positive number, set setting
    return Number(value);
  } else {
    //invalid input
    new Notice("Please specify a valid number.");
    return currentSetting;
  }
}
