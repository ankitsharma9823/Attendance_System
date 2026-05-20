import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

import app from "./app";
import { setDeviceTime, syncEmployeesFromDevice, syncWithMachine } from "./modules/device/device.engine";
import { DEVICE_CONFIG } from "./config/device.config";

const PORT = parseInt(process.env.PORT || "5000", 10);
const DEVICE_STARTUP_SYNC = process.env.DEVICE_STARTUP_SYNC === "true";

// Helper function to pause execution and let sockets clear
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runDeviceStartup = async () => {
  try {
    console.log("[Device Engine] Starting sequential hardware initialization sequence...");

    // 1. Sync Clock
    await setDeviceTime();
    console.log("[Device Engine] Step 1/3: Device clock synced successfully.");
    
    // ⏳ Allow socket thread 3 seconds to breathe
    await delay(3000);

    // 2. Pull Employees
    console.log("[Device Engine] Step 2/3: Launching employee profile registry sync...");
    await syncEmployeesFromDevice();
    
    // ⏳ Allow socket thread another 3 seconds to breathe
    await delay(3000);

    // 3. Pull Logs
    console.log("[Device Engine] Step 3/3: Fetching historical attendance logs...");
    const result = await syncWithMachine();
    console.log("[Device Engine] Sequential boot-up sync completed successfully:", result);

  } catch (err: any) {
    console.warn("[Device Engine] Startup sequence optimization warning:", err?.message ?? err);
  }
};

const startServer = () => {
  app.listen(PORT, "0.0.0.0" , async () => {
    console.log(`Production Core Engine Online on Port ${PORT}`);
    console.log(`Target Device Configuration: ${DEVICE_CONFIG.IP}:${DEVICE_CONFIG.PORT}`);

    if (DEVICE_STARTUP_SYNC) {
      // Execute sequentially right after server boot
      await runDeviceStartup();
    } else {
      console.log("[Device] Startup sync disabled (DEVICE_STARTUP_SYNC=false). Use POST /api/device/sync.");
    }

    const autoSync = process.env.DEVICE_AUTO_SYNC === "true";
    if (autoSync) {
      console.log(`[System Scheduler] Auto-sync scheduled every ${DEVICE_CONFIG.INTERVAL / 1000}s.`);
      
      setInterval(() => {
        syncWithMachine().catch((err) => {
          console.warn("[System Scheduler] Sync skipped:", err?.message ?? err);
        });
      }, DEVICE_CONFIG.INTERVAL);
    } else {
      console.log("[System Scheduler] Auto-sync OFF — manual engine trigger required.");
    }
  });
};

startServer();