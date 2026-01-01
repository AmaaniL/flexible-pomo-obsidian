import { Notice } from "obsidian";
import { TemplaterError } from "./FlexiblePomoError";

export function log_update(msg: string): void {
  const notice = new Notice("", 15000);
  // @ts-ignore
  notice.noticeEl.innerHTML = `<b>Templater update</b>:<br/>${msg}`;
}

export function log_error(e: Error | TemplaterError): void {
  const notice = new Notice("", 8000);

  if (e instanceof TemplaterError && e.console_msg) {
    // @ts-ignore
    notice.noticeEl.innerHTML = `<b>Templater Error</b>:<br/>${e.message}<br/>Check console for more information`;

    console.error("Templater Error:", e.message, "\n", e.console_msg);
  } else {
    // @ts-ignore
    notice.noticeEl.innerHTML = `<b>Templater Error</b>:<br/>${e.message}`;
  }
}
