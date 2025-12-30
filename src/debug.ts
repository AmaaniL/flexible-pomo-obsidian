import FlexiblePomoTimerPlugin from "./main";
import { TFile } from "obsidian";
import { WorkItem } from "./workbench/workitem";

export async function runWorkbenchTaskTimerTest(
  plugin: FlexiblePomoTimerPlugin
) {
  console.log("🧪 [TEST] Starting Workbench + TaskTimerPane test");

  const app = plugin.app;
  const file = app.workspace.getActiveFile();

  if (!file) {
    console.warn("🧪 [TEST] No active file — aborting test");
    return;
  }

  console.log("🧪 [TEST] Using file:", file.path);

  // Ensure workbench exists
  const workbench = plugin.pomoWorkBench;
  if (!workbench) {
    console.error("🧪 [TEST] No workbench instance found");
    return;
  }

  // Clear previous state
  workbench.clearWorkBench();

  console.log("🧪 [TEST] Linking file to workbench");
  await workbench.linkFile(file);

  const workItem = workbench.workItems[0];
  if (!workItem) {
    console.error("🧪 [TEST] No WorkItem created");
    return;
  }

  console.log("🧪 [TEST] WorkItem created:", workItem);
  console.log("🧪 [TEST] Tasks found:", workItem.initialPomoTaskItems.length);

  // Initialize runtimes explicitly
  workItem.initializeTaskRuntimes();

  console.log("🧪 [TEST] Runtimes initialized:", workItem.runtimes.size);

  // Push into TaskTimerPane
  if (workbench.taskTimerPane) {
    workbench.taskTimerPane.setWorkItem(workItem);
    console.log("🧪 [TEST] WorkItem sent to TaskTimerPane");
  } else {
    console.warn("🧪 [TEST] No TaskTimerPane available");
  }

  console.log("🧪 [TEST] Test setup complete");
}
