import { normalizePath, Notice, TFile } from "obsidian";
import Moment from "moment";
import FlexiblePomoTimerPlugin from "../main";
import { SavingSuggester } from "../suggesters/SavingSuggester";
import { AppHelper } from "../flexipomosuggesters/app-helper";

export class FileUtility {
  private plugin: FlexiblePomoTimerPlugin;

  constructor(plugin: FlexiblePomoTimerPlugin) {
    this.plugin = plugin;
  }

  loadItems(filePath: string, basename: string) {
    if (basename) {
      this.plugin.settings.active_workbench = basename;
      this.plugin.settings.active_workbench_path = filePath;
      this.plugin.saveSettings();
    }

    const workbenchFile = this.plugin.app.vault.getAbstractFileByPath(
      normalizePath(filePath)
    ) as TFile;
    if (!workbenchFile) return;

    this.plugin.app.vault.read(workbenchFile).then((value) => {
      const workBenchString = value;
      const workbenche = workBenchString.split("###");
      if (!workbenche.length) return;

      const activeBench = workbenche[workbenche.length - 1];
      const linePerLine = activeBench.split("\n");
      for (const line of linePerLine) {
        if (line.startsWith("PATHS:")) {
          const csv = line.substring(7).split(",");
          for (const csvEntry of csv) {
            const tFile = this.plugin.app.vault.getAbstractFileByPath(
              normalizePath(csvEntry.trim())
            ) as TFile;
            if (tFile?.name && this.plugin.pomoWorkBench.view) {
              this.plugin.pomoWorkBench.view.update(tFile);
            }
          }
        }
      }
    });

    this.plugin.pomoWorkBench.redraw();
  }

  async handleAppend(targetFile: TFile) {
    if (!targetFile) return;

    this.saveWorkBenchSettings(targetFile);
    this.plugin.pomoWorkBench.redraw();

    let text = `### ${Moment().format("MM/DD/YYYY HH:mm:ss")}\n\n`;
    for (const workItem of this.plugin.pomoWorkBench.workItems) {
      text += `- ${this.plugin.app.fileManager.generateMarkdownLink(
        workItem.activeNote,
        ""
      )}\n`;
    }

    text += "\n\n```\nPATHS: ";
    for (const workItem of this.plugin.pomoWorkBench.workItems) {
      text += `${workItem.activeNote.path},`;
    }
    text += "\n```\n\n";

    const existingContent = await this.plugin.app.vault.adapter.read(
      targetFile.path
    );
    await this.plugin.app.vault.adapter.write(
      targetFile.path,
      existingContent + text
    );
  }

  async handleCreateNew(
    appHelper: AppHelper,
    searchQuery: string,
    newLeaf: boolean
  ) {
    const file = await appHelper.createMarkdown(
      this.plugin.settings.templates_folder + "/" + searchQuery
    );
    if (!file) {
      new Notice("This file already exists.");
      return;
    }

    this.saveWorkBenchSettings(file);
    this.plugin.pomoWorkBench.redraw();

    let text = `### ${Moment().format("MM/DD/YYYY HH:mm:ss")}\n\n`;
    for (const workItem of this.plugin.pomoWorkBench.workItems) {
      text += `- ${this.plugin.app.fileManager.generateMarkdownLink(
        workItem.activeNote,
        ""
      )}\n`;
    }

    text += "\n\n```\nPATHS: ";
    for (const workItem of this.plugin.pomoWorkBench.workItems) {
      text += `${workItem.activeNote.path},`;
    }
    text += "\n```\n\n";

    await this.plugin.app.vault.adapter.write(file.path, text);
  }

  private saveWorkBenchSettings(file: TFile) {
    this.plugin.settings.active_workbench = file.basename;
    this.plugin.settings.active_workbench_path = file.path;
    this.plugin.saveSettings();
  }
}
