// @ts-ignore
import ZKLib from "node-zklib";
import { DEVICE_CONFIG, lastSyncTime, setLastSyncTime } from "../../config/device.config";
import { handleAttendance } from "../attendance/machine.engine";
import { setDeviceTime } from "../device/device.engine";
import prisma from "../../config/db";
const createMachineClient = () => new ZKLib(DEVICE_CONFIG.IP, DEVICE_CONFIG.PORT, DEVICE_CONFIG.TIMEOUT, DEVICE_CONFIG.IN_PORT);
let isSyncing = false;
// ── Employee Sync ─────────────────────────────────────────────────────────────
export const syncEmployeesFromDevice = async () => {
    console.log("[Machine] 👥 Syncing employees from device...");
    const zk = createMachineClient();
    try {
        await zk.createSocket();
        const result = await zk.getUsers();
        const deviceUsers = result?.data ?? [];
        if (!deviceUsers.length) {
            console.log("[Machine] No users found on device.");
            return { success: true, message: "No users found on device." };
        }
        let created = 0;
        let skipped = 0;
        for (const user of deviceUsers) {
            const empId = String(user.userId ?? user.uid ?? user.id);
            if (!empId || empId === "undefined")
                continue;
            const exists = await prisma.employee.findUnique({ where: { id: empId } });
            if (!exists) {
                await prisma.employee.create({
                    data: {
                        id: empId,
                        name: user.name?.trim() || `Employee ${empId}`,
                        department: null,
                    },
                });
                created++;
            }
            else {
                // Update name if device has a real name and DB still has placeholder
                if (user.name?.trim() && exists.name === `Employee ${empId}`) {
                    await prisma.employee.update({
                        where: { id: empId },
                        data: { name: user.name.trim() },
                    });
                }
                skipped++;
            }
        }
        console.log(`[Machine] ✅ Employee sync done — ${created} created, ${skipped} already existed.`);
        return {
            success: true,
            message: `Employee sync done: ${created} created, ${skipped} already existed.`,
        };
    }
    catch (err) {
        const message = err?.err?.message ?? err?.message ?? String(err);
        console.error("[Machine] ❌ Failed to sync employees from device:", message);
        return { success: false, message };
    }
    finally {
        try {
            await zk.disconnect();
        }
        catch (_) { }
    }
};
// ── Attendance Sync ───────────────────────────────────────────────────────────
export const syncWithMachine = async () => {
    if (isSyncing) {
        const message = "A device sync is already running. Skipping overlapping sync.";
        console.warn(`[Machine] ${message}`);
        return { success: false, message };
    }
    isSyncing = true;
    const zk = createMachineClient();
    try {
        console.log(`[Machine] Connecting to ${DEVICE_CONFIG.IP}...`);
        await zk.createSocket();
        console.log("[Machine] TCP ok");
        let logs = null;
        try {
            logs = await zk.getAttendances();
        }
        catch (hwErr) {
            const message = hwErr?.err?.message ?? hwErr?.message ?? String(hwErr);
            console.error("[Machine] ❌ Hardware buffer error. Skipping this cycle.");
            console.error("   Detail:", message);
            return { success: false, message };
        }
        if (!logs?.data?.length) {
            console.log("[Machine] No attendance data returned.");
            return { success: true, message: "No attendance data returned.", totalLogs: 0, newLogs: 0 };
        }
        // ── Determine sync cursor ─────────────────────────────────────────────────
        let cursor = lastSyncTime;
        if (!cursor) {
            const latest = await prisma.workRecord.findFirst({
                orderBy: { checkIn: "desc" },
                select: { checkIn: true },
            });
            cursor = latest?.checkIn ?? null;
        }
        const newLogs = cursor
            ? logs.data.filter((l) => new Date(l.recordTime) > cursor)
            : logs.data;
        console.log(`[Machine] ${newLogs.length} new record(s) found.`);
        // ── Process each new log ──────────────────────────────────────────────────
        for (const log of newLogs) {
            try {
                await handleAttendance({
                    employeeId: String(log.deviceUserId),
                    timestamp: log.recordTime,
                    type: log.inOutMode === 0 ? "IN" : "OUT",
                    deviceIp: DEVICE_CONFIG.IP,
                });
            }
            catch (logErr) {
                console.error(`[Machine] Failed to process log for ${log.deviceUserId}:`, logErr?.message);
            }
        }
        // ── Advance cursor ────────────────────────────────────────────────────────
        if (newLogs.length > 0) {
            const newestMs = Math.max(...newLogs.map((l) => new Date(l.recordTime).getTime()));
            setLastSyncTime(new Date(newestMs));
        }
        return {
            success: true,
            message: `${newLogs.length} new record(s) imported from ${logs.data.length} device log(s).`,
            totalLogs: logs.data.length,
            newLogs: newLogs.length,
        };
    }
    catch (err) {
        const message = err?.err?.message ?? err?.message ?? String(err);
        console.error("[Machine] Process caught exception:", message);
        return { success: false, message };
    }
    finally {
        try {
            await zk.disconnect();
        }
        catch (_) { }
        isSyncing = false;
    }
};
// ── Startup ───────────────────────────────────────────────────────────────────
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;
const BACKOFF_PAUSE_MS = 5 * 60 * 1000; // 5 minutes
const runSyncWithBackoff = async () => {
    try {
        const result = await syncWithMachine();
        if (result.success) {
            consecutiveFailures = 0;
            return;
        }
        consecutiveFailures++;
        console.error(`[Machine] Sync failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, result.message);
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.error(`[Machine] ❌ ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Pausing for 5 minutes.`);
            await new Promise((r) => setTimeout(r, BACKOFF_PAUSE_MS));
            consecutiveFailures = 0;
        }
    }
    catch (err) {
        consecutiveFailures++;
        console.error(`[Machine] Sync failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, err?.message ?? err);
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.error(`[Machine] ❌ ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Pausing for 5 minutes.`);
            await new Promise((r) => setTimeout(r, BACKOFF_PAUSE_MS));
            consecutiveFailures = 0;
        }
    }
};
export const startMachineSync = async () => {
    console.log("🚀 Fingerprint Sync Service Starting...");
    // Step 1: Sync device time
    try {
        await setDeviceTime();
        console.log("[Machine] ✅ Device time synced.");
        await new Promise((r) => setTimeout(r, 3000)); // wait before next connection
    }
    catch (err) {
        console.warn("[Machine] ⚠️  Could not sync device time on startup.");
        console.warn("[Machine] Reason:", err?.err?.message ?? err?.message ?? err);
    }
    // Step 2: Sync employees from device into DB
    await syncEmployeesFromDevice();
    await new Promise((r) => setTimeout(r, 2000));
    // Step 3: Run first attendance sync
    await runSyncWithBackoff();
    // Step 4: Schedule recurring sync
    setInterval(runSyncWithBackoff, DEVICE_CONFIG.INTERVAL);
    console.log(`[Machine] 🔁 Sync scheduled every ${DEVICE_CONFIG.INTERVAL / 1000}s`);
};
