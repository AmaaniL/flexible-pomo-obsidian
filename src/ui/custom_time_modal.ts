import { App, ButtonComponent, Modal, Notice, TextComponent } from "obsidian";
import FlexiblePomoTimerPlugin from "../main";
import { Mode, Timer } from "../timer";

export async function askCustomTimeModal(
  app: App,
  text: string,
  plugin: FlexiblePomoTimerPlugin,
  buttons: { cta: string; secondary: string; thirdaction: string } = {
    cta: "Start",
    secondary: "Cancel",
    thirdaction: "Reset To Default",
  }
): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = new CustomTimeModal(app, plugin, text, buttons);
    modal.onClose = () => {
      resolve(modal.confirmed);
    };
    modal.open();
  });
}

export class CustomTimeModal extends Modal {
  confirmed: boolean = false;
  _plugin: FlexiblePomoTimerPlugin;

  constructor(
    app: App,
    plugin: FlexiblePomoTimerPlugin,
    public text: string,
    public buttons: { cta: string; secondary: string; thirdaction: string }
  ) {
    super(app);
    this._plugin = plugin;
  }

  onOpen() {
    this.display();
  }

  display() {
    this.contentEl.empty();
    this.contentEl.addClass("confirm-modal");

    this.contentEl.createEl("p", { text: this.text });

    const textBoxEl = this.contentEl.createDiv();
    textBoxEl.createEl("br");

    const pomodoroEl = textBoxEl.createSpan();
    pomodoroEl.appendText("Pomodoro Time (Minutes): ");
    const pomoCustomText = new TextComponent(pomodoroEl).setValue(
      this._plugin.settings.pomoCustom.toString()
    );
    textBoxEl.createEl("br");

    const shortBreakEl = textBoxEl.createSpan();
    shortBreakEl.appendText("Short Break Time (Minutes): ");
    const shortBreakText = new TextComponent(shortBreakEl).setValue(
      this._plugin.settings.customShortBreak.toString()
    );
    textBoxEl.createEl("br");

    const longBreakEl = textBoxEl.createSpan();
    longBreakEl.appendText("Long Break Time (Minutes): ");
    const longBreakText = new TextComponent(longBreakEl).setValue(
      this._plugin.settings.customLongBreak.toString()
    );
    textBoxEl.createEl("br");

    const buttonEl = this.contentEl.createDiv(
      "fantasy-calendar-confirm-buttons"
    );
    buttonEl.createEl("br");

    new ButtonComponent(buttonEl)
      .setButtonText(this.buttons.cta)
      .onClick(() => {
        const pomoNumber = parseInt(pomoCustomText.getValue());
        const shortBreakNumber = parseInt(shortBreakText.getValue());
        const longBreakNumber = parseInt(longBreakText.getValue());

        if (pomoNumber > 0 && shortBreakNumber > 0 && longBreakNumber > 0) {
          // update plugin settings
          this._plugin.settings.pomoCustom = pomoNumber;
          this._plugin.settings.customShortBreak = shortBreakNumber;
          this._plugin.settings.customLongBreak = longBreakNumber;

          // restart timer with custom mode
          if (this._plugin.timer) {
            this._plugin.timer.stopTimerEarly();
          }
          this._plugin.timer = new Timer(this._plugin);
          this._plugin.timer.triggered = false;
          this._plugin.settings.lastUsedPomoType = "pomo-custom";
          this._plugin.timer.startTimer(Mode.PomoCustom);

          if (this._plugin.pomoWorkBench) {
            this._plugin.savePomoWorkBench();
          }

          this.confirmed = true;
          this.close();
        } else {
          new Notice("Invalid Inputs: all values must be > 0");
        }
      });

    new ButtonComponent(buttonEl)
      .setButtonText(this.buttons.secondary)
      .onClick(() => this.close());

    new ButtonComponent(buttonEl)
      .setButtonText(this.buttons.thirdaction)
      .onClick(() => {
        // reset to defaults
        this._plugin.settings.pomoCustom = this._plugin.settings.pomo;
        this._plugin.settings.customShortBreak =
          this._plugin.settings.shortBreak;
        this._plugin.settings.customLongBreak = this._plugin.settings.longBreak;

        pomoCustomText.setValue(this._plugin.settings.pomo.toString());
        shortBreakText.setValue(this._plugin.settings.shortBreak.toString());
        longBreakText.setValue(this._plugin.settings.longBreak.toString());

        new Notice("Resetting to Defaults.");
      });
  }
}
