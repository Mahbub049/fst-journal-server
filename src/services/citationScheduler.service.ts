import { env } from "../config/env";
import { syncAllArticleCitations } from "./citationSync.service";

let schedulerStarted = false;
let schedulerRunning = false;
let schedulerTimer: NodeJS.Timeout | null = null;

const runScheduledCitationSync = async () => {
  if (schedulerRunning) return;

  try {
    schedulerRunning = true;
    console.log("Starting scheduled citation sync...");
    const summary = await syncAllArticleCitations();
    console.log(
      `Citation sync completed. Total: ${summary.total}, Success: ${summary.success}, Failed: ${summary.failed}, Skipped: ${summary.skipped}, Increase: ${summary.totalIncrease}`
    );
  } catch (error) {
    console.error("Scheduled citation sync failed:", error);
  } finally {
    schedulerRunning = false;
  }
};

export const startCitationSyncScheduler = () => {
  if (schedulerStarted || !env.citationSync.enabled) {
    return;
  }

  schedulerStarted = true;

  const intervalHours = Math.max(1, Number(env.citationSync.intervalHours || 24));
  const startupDelayMinutes = Math.max(
    1,
    Number(env.citationSync.startupDelayMinutes || 10)
  );
  const intervalMs = intervalHours * 60 * 60 * 1000;
  const startupDelayMs = startupDelayMinutes * 60 * 1000;

  console.log(
    `Citation sync scheduler enabled. Interval: ${intervalHours} hour(s). First run after ${startupDelayMinutes} minute(s).`
  );

  setTimeout(runScheduledCitationSync, startupDelayMs);
  schedulerTimer = setInterval(runScheduledCitationSync, intervalMs);
};

export const stopCitationSyncScheduler = () => {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  schedulerStarted = false;
};
