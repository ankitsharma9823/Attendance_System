// import "dotenv/config";
// import path from "node:path";
// import { fileURLToPath } from "node:url";

// import app from "./app";
// import { setDeviceTime, syncEmployeesFromDevice, startRealTimeListener } from "./modules/device/device.engine";
// import { loadScheduleCache } from "./services/schedule.service";
// import { scheduleAbsentJob } from "./services/absent.service";
// import { DEVICE_CONFIG } from "./config/device.config";

// import http from 'http';
// import { Server as SocketIOServer } from 'socket.io';

// const PORT = parseInt(process.env.PORT || "4002", 10);
// const DEVICE_STARTUP_SYNC = process.env.DEVICE_STARTUP_SYNC === "true";

// const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// const runDeviceStartup = async () => {
//   try {
//     console.log("[Device Engine] Starting sequential hardware initialization sequence...");

//     // 1. Sync Clock
//     await setDeviceTime();
//     console.log("[Device Engine] Step 1/3: Device clock synced successfully.");
    
//     await delay(3000);

//     console.log("[Device Engine] Step 2/3: Launching employee profile registry sync...");
//     await syncEmployeesFromDevice();
    
//     await delay(3000);

//     // 3. Start Real-Time Listener
//     console.log("[Device Engine] Step 3/3: Initializing real-time punch listener...");
//     startRealTimeListener();
//     console.log("[Device Engine] Sequential boot-up completed successfully.");

//   } catch (err: any) {
//     console.warn("[Device Engine] Startup sequence optimization warning:", err?.message ?? err);
//   }
// };

// // Create HTTP server from Express app
// const httpServer = http.createServer(app);
// // Initialize Socket.IO on the same server
// export const io = new SocketIOServer(httpServer, {
//   cors: { origin: '*', methods: ['GET', 'POST'] },
// });

// httpServer.listen(PORT, async () => {
//   console.log(`Production Core Engine Online on Port ${PORT}`);
//   console.log(`Target Device Configuration: ${DEVICE_CONFIG.IP}:${DEVICE_CONFIG.PORT}`);

//   await loadScheduleCache();
//   console.log("[System] Attendance schedule loaded into memory cache.");

//   // Start absent backfill job
//   scheduleAbsentJob();

//   if (DEVICE_STARTUP_SYNC) {
//     await runDeviceStartup();
//   } else {
//     console.log("[Device] Startup sync disabled (DEVICE_STARTUP_SYNC=false). Use POST /api/device/sync.");
//   }

//   const realtimeEnabled = process.env.DEVICE_AUTO_SYNC === "true" || process.env.DEVICE_REALTIME_SYNC === "true";
//   if (realtimeEnabled && !DEVICE_STARTUP_SYNC) {
//     console.log(`[System Scheduler] Real-time listener starting (Auto-sync is ON).`);
//     startRealTimeListener();
//   } else if (!DEVICE_STARTUP_SYNC) {
//     console.log("[System Scheduler] Real-time listener OFF — manual engine trigger required.");
//   }
// });


import "dotenv/config";
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import app from "./app";
import { setDeviceTime, syncEmployeesFromDevice, startRealTimeListener } from "./modules/device/device.engine";
import { loadScheduleCache } from "./services/schedule.service";
import { scheduleAbsentJob } from "./services/absent.service";
import { DEVICE_CONFIG } from "./config/device.config";

const PORT = parseInt(process.env.PORT || "4002", 10);
const DEVICE_STARTUP_SYNC = process.env.DEVICE_STARTUP_SYNC === "true";
const ENABLE_WEBSOCKET = process.env.ENABLE_WEBSOCKET === "true";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runDeviceStartup = async () => {
  try {
    console.log("[Device Engine] Starting sequential hardware initialization sequence...");

    await setDeviceTime();
    console.log("[Device Engine] Step 1/3: Device clock synced successfully.");
    
    await delay(3000);

    console.log("[Device Engine] Step 2/3: Launching employee profile registry sync...");
    await syncEmployeesFromDevice();
    
    await delay(3000);

    console.log("[Device Engine] Step 3/3: Initializing real-time punch listener...");
    startRealTimeListener();
    console.log("[Device Engine] Sequential boot-up completed successfully.");

  } catch (err: any) {
    console.warn("[Device Engine] Startup sequence optimization warning:", err?.message ?? err);
  }
};

const httpServer = http.createServer(app);

let io: SocketIOServer | null = null;

if (ENABLE_WEBSOCKET) {
  io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });
  console.log("[System] WebSocket Server is ENABLED.");
} else {
  console.log("[System] WebSocket Server is DISABLED via ENABLE_WEBSOCKET=false.");
}

export { io };

httpServer.listen(PORT, async () => {
  console.log(`Production Core Engine Online on Port ${PORT}`);
  console.log(`Target Device Configuration: ${DEVICE_CONFIG.IP}:${DEVICE_CONFIG.PORT}`);

  await loadScheduleCache();
  console.log("[System] Attendance schedule loaded into memory cache.");

  scheduleAbsentJob();

  if (DEVICE_STARTUP_SYNC) {
    await runDeviceStartup();
  } else {
    console.log("[Device] Startup sync disabled (DEVICE_STARTUP_SYNC=false). Use POST /api/device/sync.");
  }

  const realtimeEnabled = process.env.DEVICE_AUTO_SYNC === "true" || process.env.DEVICE_REALTIME_SYNC === "true";
  if (realtimeEnabled && !DEVICE_STARTUP_SYNC) {
    console.log(`[System Scheduler] Real-time listener starting (Auto-sync is ON).`);
    startRealTimeListener();
  } else if (!DEVICE_STARTUP_SYNC) {
    console.log("[System Scheduler] Real-time listener OFF — manual engine trigger required.");
  }
});