import { App, normalizePath, TFile, TFolder } from "obsidian";
import { TemplaterError } from "./error";

export function resolveFolder(app: App, folderPath: string): TFolder {
  const normalized = normalizePath(folderPath);
  const file = app.vault.getAbstractFileByPath(normalized);

  if (!file) {
    throw new TemplaterError(`Folder "${folderPath}" doesn't exist`);
  }
  if (!(file instanceof TFolder)) {
    throw new TemplaterError(`${folderPath} is a file, not a folder`);
  }

  return file;
}

export function resolveFile(app: App, filePath: string): TFile {
  const normalized = normalizePath(filePath);
  const file = app.vault.getAbstractFileByPath(normalized);

  if (!file) {
    throw new TemplaterError(`File "${filePath}" doesn't exist`);
  }
  if (!(file instanceof TFile)) {
    throw new TemplaterError(`${filePath} is a folder, not a file`);
  }

  return file;
}
