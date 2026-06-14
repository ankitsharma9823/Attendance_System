import cron from "node-cron";
import { evaluateEndOfDayMissingPunches } from "../modules/attendance/machine.engine";

cron.schedule("15 11 * * 0-5", async () => {
  console.log("[Cron] Running end-of-day sweep...");
  try {
    await evaluateEndOfDayMissingPunches();
    console.log("[Cron] End-of-day sweep complete.");
  } catch (e) {
    console.error("[Cron] End-of-day sweep failed:", e);
  }
});

console.log("[Cron] Scheduler initialized.");