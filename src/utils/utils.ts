import { TemplaterError } from "./FlexiblePomoError";
import {
  App,
  normalizePath,
  TAbstractFile,
  TFile,
  TFolder,
  Vault,
} from "obsidian";

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function escape_RegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function resolve_tfolder(app: App, folder_str: string): TFolder {
  folder_str = normalizePath(folder_str);

  const folder = app.vault.getAbstractFileByPath(folder_str);
  if (!folder) {
    throw new TemplaterError(`Folder "${folder_str}" doesn't exist`);
  }
  if (!(folder instanceof TFolder)) {
    throw new TemplaterError(`${folder_str} is a file, not a folder`);
  }

  return folder;
}

export function resolve_tfile(app: App, file_str: string): TFile {
  file_str = normalizePath(file_str);

  const file = app.vault.getAbstractFileByPath(file_str);
  if (!file) {
    throw new TemplaterError(`File "${file_str}" doesn't exist`);
  }
  if (!(file instanceof TFile)) {
    throw new TemplaterError(`${file_str} is a folder, not a file`);
  }

  return file;
}

export function get_tfiles_from_folder(
  app: App,
  folder_str: string
): Array<TFile> {
  const folder = resolve_tfolder(app, folder_str);

  const files: Array<TFile> = [];
  Vault.recurseChildren(folder, (file: TAbstractFile) => {
    if (file instanceof TFile) {
      files.push(file);
    }
  });

  files.sort((a, b) => {
    return a.basename.localeCompare(b.basename);
  });

  return files;
}
export function parseDurationFromText(text: string): number | undefined {
  const regex = /\b(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)\b|\b(\d+)\s*h\b/i;
  const match = text.match(regex);
  if (!match) return undefined;

  const hours = match[1] || match[3] ? parseInt(match[1] ?? match[3], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;

  const ms = (hours * 60 + minutes) * 60 * 1000;
  return ms > 0 ? ms : undefined;
}

export function arraymove<T>(
  arr: T[],
  fromIndex: number,
  toIndex: number
): void {
  if (toIndex < 0 || toIndex === arr.length) {
    return;
  }
  const element = arr[fromIndex];
  arr[fromIndex] = arr[toIndex];
  arr[toIndex] = element;
}
