import { TemplaterError } from "./FlexiblePomoError";
import { log_error } from "./log";

export async function errorWrapper<T>(
  fn: () => Promise<T>,
  msg: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (e: any) {
    if (!(e instanceof TemplaterError)) {
      log_error(new TemplaterError(msg, e?.message));
    } else {
      log_error(e);
    }
    return null;
  }
}

export function errorWrapperSync<T>(fn: () => T, msg: string): T | null {
  try {
    return fn();
  } catch (e: any) {
    log_error(new TemplaterError(msg, e?.message));
    return null;
  }
}
