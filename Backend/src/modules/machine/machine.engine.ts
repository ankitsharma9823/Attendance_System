// @ts-ignore
import ZKLib from "node-zklib";
import { DEVICE_CONFIG, lastSyncTime, setLastSyncTime, lastSyncSn, setLastSyncSn } from "../../config/device.config";
import { handleAttendance } from "../attendance/machine.engine";
import { setDeviceTime } from "../device/device.engine";
import prisma from "../../config/db";

type SyncResult = {
  success: boolean;
  message: string;
  totalLogs?: number;
  newLogs?: number;
};

const createMachineClient = () =>
  new ZKLib(DEVICE_CONFIG.IP, DEVICE_CONFIG.PORT, DEVICE_CONFIG.TIMEOUT, DEVICE_CONFIG.IN_PORT);

let isSyncing = false;

// FIX: Use current real time as fallback for corrupt timestamps
// If device saves a punch with 1999/2000 timestamp, use current server time instead
const resolveTimestamp = (l: any): Date | null => {
  const rawTime = l.recordTime ?? l.record_time ?? l.time ?? l.timestamp;
  if (!rawTime) return null;
  const t = rawTime instanceof Date ? rawTime : new Date(rawTime);
  if (isNaN(t.getTime())) return null;

  // If timestamp looks corrupt (before 2010), use current time as fallback
  if (t.getFullYear() < 2010) {
    console.warn(`[Machine] Corrupt timestamp for emp=${l.deviceUserId ?? l.userId} (${t.toISOString()}) — using server time`);
    return new Date(); // current UTC time
  }

  return t;
};

const IMPORT_FROM_SN: number = 0; // process all records by sequence number

export const syncEmployeesFromDevice = async (): Promise<SyncResult> => {
  console.log("[Machine] 👥 Syncing employees from device...");
  const zk = createMachineClient();

  try {
    await zk.createSocket();
    const result = await zk.getUsers();
    const deviceUsers: any[] = result?.data ?? [];

    if (!deviceUsers.length) {
      console.log("[Machine] No users found on device.");
      return { success: true, message: "No users found on device." };
    }

    let created = 0, skipped = 0;

    for (const user of deviceUsers) {
      const empId = String(user.userId ?? user.uid ?? user.id ?? "").trim();
      if (!empId || empId === "undefined" || empId === "0") continue;

      const exists = await prisma.employee.findUnique({ where: { id: empId } });

      if (!exists) {
        await prisma.employee.create({
          data: { id: empId, name: user.name?.trim() || `Employee ${empId}`, department: null },
        });
        created++;
      } else {
        if (user.name?.trim() && exists.name === `Employee ${empId}`) {
          await prisma.employee.update({
            where: { id: empId },
            data: { name: user.name.trim() },
          });
        }
        skipped++;
      }
    }

    console.log(`[Machine] ✅ ${created} created, ${skipped} already existed.`);
    return { success: true, message: `Employee sync done: ${created} created, ${skipped} existed.` };
  } catch (err: any) {
    const message = err?.err?.message ?? err?.message ?? String(err);
    console.error("[Machine] ❌ Failed to sync employees:", message);
    return { success: false, message };
  } finally {
    try { await zk.disconnect(); } catch (_) {}
  }
};

export const syncWithMachine = async (): Promise<SyncResult> => {
  if (isSyncing) {
    const message = "Sync already running. Skipping.";
    console.warn(`[Machine] ${message}`);
    return { success: false, message };
  }

  isSyncing = true;
  const zk = createMachineClient();

  try {
    console.log(`[Machine] Connecting to ${DEVICE_CONFIG.IP}:${DEVICE_CONFIG.PORT}...`);
    await zk.createSocket();
    console.log("[Machine] TCP connected ✓");

    let logs: { data: any[] } | null = null;
    try {
      logs = await zk.getAttendances();
    } catch (hwErr: any) {
      const message = hwErr?.err?.message ?? hwErr?.message ?? String(hwErr);
      console.error("[Machine] ❌ Hardware error:", message);
      return { success: false, message };
    }

    if (!logs?.data?.length) {
      console.log("[Machine] No attendance data returned.");
      return { success: true, message: "No attendance data returned.", totalLogs: 0, newLogs: 0 };
    }

    console.log(`[Machine] Total device logs: ${logs.data.length}`);
    if (logs.data.length > 0) {
      console.log("[Machine] Sample log record:", JSON.stringify(logs.data[0]));
    }

    // Use userSn (sequence number) as cursor instead of timestamp
    const cursor: number = lastSyncSn;
    console.log(`[Machine] SN Cursor: ${cursor} (last processed sequence number)`);

    const newLogs = logs.data.filter((l: any) => {
      const sn = l.userSn ?? l.sn ?? 0;
      return sn > cursor;
    });

    console.log(`[Machine] ${newLogs.length} new record(s) to process (SN > ${cursor}).`);

    let processedCount = 0;
    for (const log of newLogs) {
      const rawEmpId = log.deviceUserId ?? log.userId ?? log.uid ?? log.id;
      const empId = String(rawEmpId ?? "").trim();

      if (!empId || empId === "undefined" || empId === "0") {
        console.warn("[Machine] Skipping log with no employee ID:", JSON.stringify(log));
        continue;
      }

      const resolvedTime = resolveTimestamp(log);
      if (!resolvedTime) {
        console.warn("[Machine] Skipping log with unresolvable timestamp:", JSON.stringify(log));
        continue;
      }

      console.log(`[Machine] Processing SN=${log.userSn} emp=${empId} time=${resolvedTime.toISOString()}`);

      try {
        await handleAttendance({
          employeeId: empId,
          timestamp: resolvedTime,
          type: log.inOutMode === 0 ? "IN" : "OUT",
          deviceIp: DEVICE_CONFIG.IP,
        });
        processedCount++;
      } catch (logErr: any) {
        console.error(`[Machine] Failed to process log for ${empId}:`, logErr?.message);
      }
    }

    // Advance cursor by max userSn processed
    if (newLogs.length > 0) {
      const maxSn = Math.max(...newLogs.map((l: any) => l.userSn ?? l.sn ?? 0));
      if (maxSn > 0 && maxSn > cursor) {
        setLastSyncSn(maxSn);
        console.log(`[Machine] ✅ SN cursor advanced from ${cursor} to ${maxSn}`);
      }

      // Also update time cursor for compatibility
      const validTimestamps = newLogs
        .map((l: any) => {
          const t = resolveTimestamp(l);
          return t ? t.getTime() : 0;
        })
        .filter((t: number) => t > 0);
      if (validTimestamps.length > 0) {
        const maxTime = new Date(Math.max(...validTimestamps));
        setLastSyncTime(maxTime);
        console.log(`[Machine] Time cursor updated to ${maxTime.toISOString()}`);
      }
    }

    return {
      success: true,
      message: `${processedCount}/${newLogs.length} record(s) imported from ${logs.data.length} device log(s).`,
      totalLogs: logs.data.length,
      newLogs: newLogs.length,
    };
  } catch (err: any) {
    const message = err?.err?.message ?? err?.message ?? String(err);
    console.error("[Machine] Exception:", message);
    return { success: false, message };
  } finally {
    try { await zk.disconnect(); } catch (_) {}
    isSyncing = false;
  }
};

let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;
const BACKOFF_PAUSE_MS = 5 * 60 * 1000;

const runSyncWithBackoff = async (): Promise<void> => {
  try {
    const result = await syncWithMachine();
    if (result.success) { consecutiveFailures = 0; return; }

    consecutiveFailures++;
    console.error(`[Machine] Sync failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, result.message);

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(`[Machine] ❌ Pausing 5 min after ${MAX_CONSECUTIVE_FAILURES} failures.`);
      await new Promise((r) => setTimeout(r, BACKOFF_PAUSE_MS));
      consecutiveFailures = 0;
    }
  } catch (err: any) {
    consecutiveFailures++;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      await new Promise((r) => setTimeout(r, BACKOFF_PAUSE_MS));
      consecutiveFailures = 0;
    }
  }
};

export const startMachineSync = async (): Promise<void> => {
  console.log("🚀 Fingerprint Sync Service Starting...");

  try {
    await setDeviceTime();
    console.log("[Machine] ✅ Device time synced.");
    await new Promise((r) => setTimeout(r, 3000));
  } catch (err: any) {
    console.warn("[Machine] ⚠️  Could not sync device time:", err?.err?.message ?? err?.message ?? err);
  }

  await syncEmployeesFromDevice();
  await new Promise((r) => setTimeout(r, 2000));

  await runSyncWithBackoff();

  setInterval(runSyncWithBackoff, DEVICE_CONFIG.INTERVAL);
  console.log(`[Machine] 🔁 Sync scheduled every ${DEVICE_CONFIG.INTERVAL / 1000}s`);
};