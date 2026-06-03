// @ts-ignore
import ZKLib from "node-zklib";
import {
  DEVICE_CONFIG,
  lastLogCount,
  lastSyncTime,
  setLastLogCount,
  setLastSyncTime,
} from "../../config/device.config";
import { handleAttendance } from "../attendance/machine.engine";
import prisma from "../../config/db";

let isSyncInProgress = false;
// 🔒 Mutex to enforce strict sequential machine operations and prevent socket jamming
let currentDeviceMutex: Promise<any> | null = null;

// Real-time listener state
let realTimeZk: InstanceType<typeof ZKLib> | null = null;
let isRealTimePaused = false;

const CMD_GET_TIME = 201;
const CMD_SET_TIME = 202;

// ──────────────────────────────────────────
//           ZK TIME HELPERS
// ──────────────────────────────────────────

const decodeZkPackedTime = (packed: number): Date => {
  let time = packed;
  const second = time % 60;
  time = (time - second) / 60;
  const minute = time % 60;
  time = (time - minute) / 60;
  const hour = time % 24;
  time = (time - hour) / 24;
  const day = (time % 31) + 1;
  time = (time - (day - 1)) / 31;
  const month = time % 12;
  time = (time - month) / 12;
  const year = time + 2000;
  return new Date(year, month, day, hour, minute, second);
};

const encodeZkPackedTime = (date: Date): number =>
  ((date.getFullYear() % 100) * 12 * 31 +
    date.getMonth() * 31 +
    date.getDate() -
    1) *
    (24 * 60 * 60) +
  (date.getHours() * 60 + date.getMinutes()) * 60 +
  date.getSeconds();

const encodeZkPackedBuffer = (date: Date): Buffer => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(encodeZkPackedTime(date), 0);
  return buf;
};

const readPackedTimeFromCmdReply = (res: unknown): number => {
  const buf = Buffer.isBuffer(res)
    ? res
    : Buffer.from(
        (res as { data?: number[] })?.data ??
          (res as ArrayLike<number> ?? []),
      );

  if (!buf || buf.length < 12) {
    console.warn(
      `[Device Engine] Warning: Short packet from machine (${buf?.length ?? 0} bytes). Falling back to current timestamp.`,
    );
    return encodeZkPackedTime(getNepaliDate());
  }

  return buf.readUInt32LE(8);
};

const deviceErrorMessage = (err: unknown): string => {
  const raw =
    err && typeof err === "object"
      ? (err as { message?: string; err?: { message?: string } }).err
          ?.message ??
        (err as { message?: string }).message ??
        String(err)
      : String(err);

  console.error("[Device Error Log]:", raw);

  if (raw.includes("TIMEOUT") || raw.includes("TIME OUT")) {
    return "The biometric machine is taking too long to respond. Please try again in a few minutes.";
  }
  if (raw.includes("ECONNREFUSED") || raw.includes("EHOSTUNREACH")) {
    return "Unable to establish a connection with the biometric machine. Check network cabling or machine power.";
  }
  if (raw.includes("ALREADY_CONNECTED")) {
    return "Machine is currently processing another request. Please wait.";
  }

  return "An unexpected hardware communication error occurred. Check machine status.";
};

// ──────────────────────────────────────────
//           DEVICE MUTEX / CONNECTION
// ──────────────────────────────────────────

const withDevice = async <T>(
  fn: (zk: InstanceType<typeof ZKLib>) => Promise<T>,
): Promise<T> => {
  // Pause real-time listener if active
  if (realTimeZk && !isRealTimePaused) {
    isRealTimePaused = true;
    console.log(`[Device Engine] Pausing real-time listener for admin action...`);
    try {
      await realTimeZk.disconnect();
    } catch (_) {}
  }

  if (currentDeviceMutex) {
    console.log(`[Device Engine] Port busy. Queueing request...`);
    await currentDeviceMutex.catch(() => {});
  }

  let resolveLock: () => void = () => {};
  currentDeviceMutex = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });

  const comKey = Number(DEVICE_CONFIG.PASSWORD ?? 0);
  const zk = new ZKLib(
    DEVICE_CONFIG.IP,
    DEVICE_CONFIG.PORT,
    DEVICE_CONFIG.TIMEOUT,
    DEVICE_CONFIG.IN_PORT,
    comKey,
  );

  try {
    await zk.createSocket();
    return await fn(zk);
  } catch (err) {
    try {
      if (zk.zklibTcp && zk.zklibTcp.socket) {
        zk.zklibTcp.socket.destroy();
      }
    } catch (_) {}
    throw new Error(deviceErrorMessage(err));
  } finally {
    try {
      await zk.disconnect();
    } catch (_) {}
    resolveLock();
    currentDeviceMutex = null;

    // Resume real-time listener
    if (isRealTimePaused) {
      isRealTimePaused = false;
      startRealTimeListener();
    }
  }
};

// ──────────────────────────────────────────
//           NEPAL TIME HELPERS
// ──────────────────────────────────────────

export const getNepaliDate = (): Date => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  const n = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  return new Date(
    n("year"),
    n("month") - 1,
    n("day"),
    n("hour"),
    n("minute"),
    n("second"),
  );
};

const formatWallClock = (d: Date) =>
  `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()} ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d
    .getSeconds()
    .toString()
    .padStart(2, "0")}`;

// ──────────────────────────────────────────
//           DEVICE CLOCK
// ──────────────────────────────────────────

export const getDeviceTime = async (): Promise<Date> => {
  return withDevice(async (zk) => {
    const res = await zk.executeCmd(CMD_GET_TIME, "");
    return decodeZkPackedTime(readPackedTimeFromCmdReply(res));
  });
};

export const setDeviceTime = async (date?: Date): Promise<Date> => {
  const target = date ?? getNepaliDate();

  await withDevice(async (zk) => {
    await zk.executeCmd(CMD_SET_TIME, encodeZkPackedBuffer(target));
  });

  await new Promise((r) => setTimeout(r, 1500));

  const verified = await getDeviceTime();
  const driftMinutes = Math.abs((verified.getTime() - target.getTime()) / 60000);

  if (driftMinutes > 2) {
    throw new Error(
      `Device clock was not updated (device shows ${formatWallClock(verified)}, expected ${formatWallClock(target)}). Set time manually: Menu → System → Date & Time.`,
    );
  }

  console.log(`[Device Engine] Device clock verified: ${formatWallClock(verified)}`);
  return verified;
};

export const getMachineTimeInfo = async (req: any, res: any) => {
  try {
    const { deviceTime, info, logs } = await withDevice(async (zk) => {
      const timeRes = await zk.executeCmd(CMD_GET_TIME, "");
      const deviceTime = decodeZkPackedTime(readPackedTimeFromCmdReply(timeRes));
      const info = (await zk.getInfo()) as { logCounts?: number };
      const logs = (await zk.getAttendances()) as { data?: unknown[] };
      return { deviceTime, info, logs };
    });

    const serverNepal = getNepaliDate();
    const driftMinutes = Math.round(
      Math.abs(deviceTime.getTime() - serverNepal.getTime()) / 60000,
    );

    return res.status(200).json({
      success: true,
      status: "ONLINE",
      deviceIp: DEVICE_CONFIG.IP,
      deviceTime: formatWallClock(deviceTime),
      serverNepalTime: formatWallClock(serverNepal),
      driftMinutes,
      totalLogsStored: logs?.data?.length ?? 0,
      logCounts: info?.logCounts,
      lastSyncTime: lastSyncTime?.toISOString() ?? null,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Could not communicate with machine.",
      error: err?.message || err,
    });
  }
};

export const syncDeviceTimeHandler = async (_req: any, res: any) => {
  try {
    const syncedAt = await setDeviceTime();
    return res.status(200).json({
      success: true,
      message: "Device clock synced to Nepal time.",
      deviceTime: formatWallClock(syncedAt),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


type DeviceLog = {
  userSn?: number;
  deviceUserId?: string;
  userId?: string;
  uid?: number;
  recordTime?: Date;
  inOutMode?: number;
};

const PUNCH_DEBOUNCE_MS =
  parseInt(process.env.PUNCH_DEBOUNCE_SECONDS || "45", 10) * 1000;

const parseHardwareTime = (logItem: {
  recordTime?: Date;
  record_time?: Date;
  time?: Date;
  timestamp?: Date;
}): Date => {
  const value =
    logItem.recordTime ??
    logItem.record_time ??
    logItem.time ??
    logItem.timestamp;
  if (!value) return new Date();
  const parsed = value instanceof Date ? value : new Date(value);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const dedupeRapidPunches = (logs: DeviceLog[]): DeviceLog[] => {
  const result: DeviceLog[] = [];
  for (const log of logs) {
    const empId = String(log.deviceUserId ?? log.userId ?? log.uid ?? "").trim();
    const txMs = parseHardwareTime(log).getTime();
    const prev = result[result.length - 1];
    if (prev) {
      const prevEmp = String(prev.deviceUserId ?? prev.userId ?? prev.uid ?? "").trim();
      const prevMs = parseHardwareTime(prev).getTime();
      if (empId === prevEmp && txMs - prevMs < PUNCH_DEBOUNCE_MS) {
        result[result.length - 1] = log;
        continue;
      }
    }
    result.push(log);
  }
  return result;
};

const ensureEmployee = async (empId: string, name?: string, role: number = 0) => {
  await prisma.employee.upsert({
    where: { id: empId },
    update: {
      ...(name ? { name: name.trim() } : {}),
      deviceRole: role,
      isActive: true,
    },
    create: {
      id: empId,
      name: name?.trim() || `Employee ${empId}`,
      deviceRole: role,
    },
  });
};

export const syncEmployeesFromDevice = async () => {
  console.log("[Device Engine] Pulling employee registries from ZK machine...");

  try {
    const users = (await withDevice((zk) => zk.getUsers())) as {
      data?: Array<{ userId?: string; uid?: number; name?: string; role?: number }>;
    };
    const userList = users?.data ?? [];

    let processed = 0;
    for (const u of userList) {
      const empId = String(u.userId ?? u.uid ?? "").trim();
      if (!empId || empId === "0" || empId === "undefined") continue;
      await ensureEmployee(empId, u.name, typeof u.role === "number" ? u.role : 0);
      processed++;
    }

    return {
      success: true,
      message: `Successfully synchronized ${processed} employee profiles.`,
    };
  } catch (err: any) {
    console.error("[Device Engine] Employee synchronization failed:", err.message);
    return { success: false, message: err.message };
  }
};

export const syncDeviceUsersFromDatabase = async () => {
  console.log("[Device Engine] Restoring employee registry from database to ZK machine...");

  return withDevice(async (zk) => {
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true, deviceRole: true },
    });

    const users = (await zk.getUsers()) as {
      data?: Array<{ uid?: number; userId?: string; name?: string; role?: number }>;
    };
    const deviceList = users?.data ?? [];
    const deviceMap = new Map<string, { uid?: number; name?: string; role?: number }>();
    const usedUids: number[] = [];

    for (const u of deviceList) {
      const key = String(u.userId ?? u.uid ?? "").trim();
      if (!key || key === "0") continue;
      deviceMap.set(key, u);
      if (typeof u.uid === "number" && u.uid > 0) usedUids.push(u.uid);
    }

    const nextUid = () => {
      const next = Math.max(0, ...usedUids) + 1;
      usedUids.push(next);
      return next;
    };

    let writes = 0;
    await zk.disableDevice();
    try {
      for (const employee of employees) {
        const existing = deviceMap.get(employee.id);
        const role = typeof employee.deviceRole === "number" ? employee.deviceRole : 0;
        const uid = existing?.uid ?? nextUid();
        const userBuf = buildUserBuffer(uid, employee.id, employee.name, role);

        if (!existing) {
          await zk.executeCmd(8, userBuf);
          writes++;
          continue;
        }

        const nameChanged = String(existing.name ?? "").trim() !== employee.name.trim();
        const roleChanged = existing.role !== role;
        if (nameChanged || roleChanged) {
          await zk.executeCmd(8, userBuf);
          writes++;
        }
      }

      if (writes > 0) {
        await zk.executeCmd(1013, "");
        await zk.executeCmd(1014, "");
      }
    } finally {
      await zk.enableDevice();
    }

    return {
      success: true,
      message: writes > 0
        ? `Restored ${writes} employee record(s) to the device.`
        : "Device employee registry already matches the database.",
    };
  });
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const syncWithMachine = async () => {
  if (isSyncInProgress) {
    return { success: false, message: "Sync already running. Wait and try again." };
  }

  isSyncInProgress = true;
  console.log("[Device Engine] Polling device for new attendance logs...");

  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[Device Engine] Retry ${attempt}/${maxAttempts}...`);
        await sleep(2000);
      }
      const result = await runSyncOnce();
      isSyncInProgress = false;
      return result;
    } catch (err: any) {
      lastError = err;
      const msg = deviceErrorMessage(err);
      console.warn(`[Device Engine] Attempt ${attempt} failed:`, msg);
      if (!msg.includes("TIMEOUT") && !msg.includes("TIME OUT")) {
        isSyncInProgress = false;
        throw err;
      }
    }
  }

  isSyncInProgress = false;
  const message = deviceErrorMessage(lastError);
  console.error("[Device Engine] Sync failed after retries:", message);
  return { success: false, message };
};

const runSyncOnce = async () => {
  const logs = (await withDevice((zk) => zk.getAttendances())) as {
    data?: DeviceLog[];
  };

  if (!logs?.data?.length) {
    return {
      success: true,
      message: "No attendance data found on device.",
      recordsProcessed: 0,
    };
  }

  const totalOnDevice = logs.data.length;
  let logCursor = lastLogCount;
  let newLogs: DeviceLog[];

  if (logCursor < 0) {
    const replayN = Math.abs(logCursor);
    newLogs = logs.data.slice(-replayN);
    logCursor = totalOnDevice - replayN;
    setLastLogCount(logCursor);
    console.log(`[Device Engine] Replaying last ${replayN} log(s) from device`);
  } else {
    if (totalOnDevice < logCursor) {
      logCursor = 0;
      setLastLogCount(0);
    }
    if (logCursor === 0 && totalOnDevice > 100) {
      logCursor = totalOnDevice;
      setLastLogCount(logCursor);
      console.log(
        `[Device Engine] Log cursor aligned to ${logCursor} (skip ${totalOnDevice} old logs)`,
      );
    }
    newLogs = logs.data.slice(logCursor);
  }

  const latestOnDevice = logs.data[totalOnDevice - 1];
  console.log(
    `[Device Engine] ${newLogs.length} new log(s) (cursor=${logCursor}, device total=${totalOnDevice})`,
  );

  if (newLogs.length === 0 && latestOnDevice) {
    console.log(
      `[Device Engine] Latest on device: user=${latestOnDevice.deviceUserId} at ${formatWallClock(parseHardwareTime(latestOnDevice))}`,
    );
  }

  const punchesToProcess = dedupeRapidPunches(newLogs);
  if (punchesToProcess.length < newLogs.length) {
    console.log(
      `[Device Engine] Debounced ${newLogs.length - punchesToProcess.length} duplicate scan(s) within ${PUNCH_DEBOUNCE_MS / 1000}s`,
    );
  }

  let successfullyLogged = 0;

  for (const log of punchesToProcess) {
    const empId = String(log.deviceUserId ?? log.userId ?? log.uid ?? "").trim();
    if (!empId || empId === "0") continue;

    const txTime = parseHardwareTime(log);

    try {
      await ensureEmployee(empId);

      // ✅ handleAttendance resolves punch kind from record state
      // and validates against dynamic schedule windows internally
      const saved = await handleAttendance({
        employeeId: empId,
        timestamp: txTime,
        deviceIp: DEVICE_CONFIG.IP,
      });

      if (saved) successfullyLogged++;
    } catch (innerError: any) {
      console.error(
        `[Device Engine] Failed processing log for user ${empId}:`,
        innerError.message,
      );
      break;
    }
  }

  const cursorAdvanced = logCursor + newLogs.length;
  if (newLogs.length > 0) {
    setLastLogCount(cursorAdvanced);
    const processed = logs.data.slice(logCursor, cursorAdvanced);
    const newestMs = Math.max(...processed.map((l) => parseHardwareTime(l).getTime()));
    setLastSyncTime(new Date(newestMs));
  }

  return {
    success: true,
    message: `Imported ${successfullyLogged} of ${newLogs.length} new log(s) from device.`,
    totalDownloaded: logs.data.length,
    newLogsFound: newLogs.length,
    recordsProcessed: successfullyLogged,
  };
};

// ──────────────────────────────────────────
//           USER CRUD FUNCTIONS
// ──────────────────────────────────────────

// ZKTeco user record — 72-byte buffer layout:
//   [0-1]   uid        UInt16LE — internal hardware index
//   [2]     role       UInt8    — 0=user, 14=admin
//   [3-10]  password   8 bytes  — ASCII, zero-padded
//   [11-34] name       24 bytes — ASCII, zero-padded
//   [35-47] cardNo     zeros
//   [48-56] userId     ASCII    — badge number shown on machine
//   [57-71] reserved   zeros
const buildUserBuffer = (
  uid: number,
  userId: string,
  name: string,
  role: number,
  password: string = "",
): Buffer => {
  const buf = Buffer.alloc(72, 0);
  buf.writeUInt16LE(uid, 0);
  buf.writeUInt8(role & 0xff, 2);
  Buffer.from(password.slice(0, 8), "ascii").copy(buf, 3);
  Buffer.from(name.slice(0, 24), "ascii").copy(buf, 11);
  Buffer.from(userId.slice(0, 9), "ascii").copy(buf, 48);
  return buf;
};

export const getDeviceUsers = async () => {
  return withDevice(async (zk) => {
    const users = (await zk.getUsers()) as {
      data?: Array<{ userId?: string; uid?: number; name?: string; role?: number }>;
    };
    return users?.data ?? [];
  });
};

export const getNextAvailableDeviceId = async (): Promise<number> => {
  const users = await getDeviceUsers();
  if (!users || users.length === 0) return 1;

  const uids = users.map((u) => {
    const n =
      typeof u.uid === "number"
        ? u.uid
        : parseInt(String(u.uid ?? u.userId ?? ""), 10);
    return Number.isFinite(n) && n > 0 && n <= 65535 ? n : 0;
  });

  const maxUid = Math.max(...uids, 0);
  if (maxUid >= 65534) throw new Error("Device user slots full.");
  console.log(`[Device Engine] Next UID: ${maxUid + 1} (current max uid: ${maxUid})`);
  return maxUid + 1;
};

export const addDeviceUser = async (name: string, role: number = 0) => {
  return withDevice(async (zk) => {
    const users = (await zk.getUsers()) as {
      data?: Array<{ uid?: number; userId?: string }>;
    };
    const list = users?.data ?? [];
    const uids = list.map((u) => {
      const n =
        typeof u.uid === "number"
          ? u.uid
          : parseInt(String(u.uid ?? u.userId ?? ""), 10);
      return Number.isFinite(n) && n > 0 && n <= 65535 ? n : 0;
    });
    const nextId = Math.max(...uids, 0) + 1;
    if (nextId > 65534) throw new Error("Device user slots full.");

    console.log(`[Device Engine] Adding user "${name}" as uid=${nextId}`);

    await zk.disableDevice();
    try {
      const userBuf = buildUserBuffer(nextId, String(nextId), name.trim(), role);
      await zk.executeCmd(8, userBuf);   // CMD_USER_WRQ
      await zk.executeCmd(1013, "");     // CMD_REFRESHDATA
      await zk.executeCmd(1014, "");     // CMD_REFRESHOPTION
    } finally {
      await zk.enableDevice();
    }

    await ensureEmployee(String(nextId), name, role);
    return {
      success: true,
      message: `User registered successfully.`,
      employeeId: nextId,
    };
  });
};

export const updateDeviceUser = async (
  uid: number,
  userid: string,
  name: string,
  role: number = 0,
) => {
  return withDevice(async (zk) => {
    const userBuf = buildUserBuffer(uid, userid, name.trim(), role);
    await zk.executeCmd(8, userBuf);   // CMD_USER_WRQ
    await zk.executeCmd(1013, "");     // CMD_REFRESHDATA
    await prisma.employee
      .update({ where: { id: userid }, data: { name: name.trim(), deviceRole: role, isActive: true } })
      .catch(() => {});
    console.log(
      `[Device Engine] User updated: uid=${uid} userid=${userid} name="${name}" role=${role}`,
    );
    return { success: true, message: `User updated successfully.` };
  });
};

export const deleteDeviceUser = async (uid: number | string, userid: string) => {
  return withDevice(async (zk) => {
    let numericUid = typeof uid === "string" ? parseInt(uid, 10) : uid;

    if (isNaN(numericUid) || numericUid <= 0) {
      console.log(`[Device Engine] UID missing — looking up by userId: ${userid}`);
      const usersResponse = (await zk.getUsers()) as {
        data?: Array<{ userId?: string; uid?: number }>;
      };
      const match = usersResponse?.data?.find(
        (u) => String(u.userId).trim() === String(userid).trim(),
      );
      if (match?.uid) {
        numericUid = match.uid;
        console.log(`[Device Engine] Resolved UID: ${numericUid}`);
      } else {
        throw new Error(`Cannot delete: no hardware UID found for user "${userid}".`);
      }
    }

    console.log(`[Device Engine] Deleting UID=${numericUid} userId=${userid}`);

    // 1. Clear fingerprint templates (CMD_DEL_FPTMP = 134)
    try {
      const fpBuf = Buffer.alloc(6, 0);
      fpBuf.writeUInt16LE(numericUid, 0);
      fpBuf.writeUInt16LE(0xffff, 2);
      fpBuf.writeUInt16LE(1, 4);
      await zk.executeCmd(134, fpBuf);
    } catch {
      console.warn(`[Device Engine] Fingerprint clear skipped (non-critical).`);
    }

    // 2. Delete user record (CMD_DELETE_USER = 18)
    const delBuf = Buffer.alloc(2);
    delBuf.writeUInt16LE(numericUid, 0);
    await zk.executeCmd(18, delBuf);

    // 3. Commit to flash
    await zk.executeCmd(1013, "");     // CMD_REFRESHDATA

    // 4. Preserve database backup, but mark the employee inactive
    try {
      await prisma.employee.update({ where: { id: userid }, data: { isActive: false } });
      console.log(`[Device Engine] DB record marked inactive for "${userid}".`);
    } catch (dbErr: any) {
      if (dbErr.code === "P2025") {
        console.log(`[Device Engine] "${userid}" already absent from DB.`);
      } else {
        console.error(`[Device Engine] DB desync:`, dbErr.message);
      }
    }

    return {
      success: true,
      message: `User ${userid} deleted from device and preserved in database backup.`,
    };
  });
};

export const clearDeviceFingerprint = async (uid: number) => {
  return withDevice(async (zk) => {
    const buf = Buffer.alloc(6, 0);
    buf.writeUInt16LE(uid, 0);
    buf.writeUInt16LE(0xffff, 2);
    buf.writeUInt16LE(1, 4);
    await zk.executeCmd(134, buf);   // CMD_DEL_FPTMP
    await zk.executeCmd(1013, "");   // CMD_REFRESHDATA
    console.log(`[Device Engine] Fingerprints cleared for uid=${uid}`);
    return { success: true, message: `Fingerprints cleared.` };
  });
};

// ──────────────────────────────────────────
//           REAL-TIME EVENT LISTENER
// ──────────────────────────────────────────

export const startRealTimeListener = async () => {
  if (isRealTimePaused) return;
  
  console.log("[Device Engine] Starting persistent real-time listener...");

  const comKey = Number(DEVICE_CONFIG.PASSWORD ?? 0);
  const zk = new ZKLib(
    DEVICE_CONFIG.IP,
    DEVICE_CONFIG.PORT,
    DEVICE_CONFIG.TIMEOUT,
    DEVICE_CONFIG.IN_PORT,
    comKey,
  );

  realTimeZk = zk;

  try {
    await zk.createSocket();
    console.log("[Device Engine] Real-time socket connected.");

    zk.getRealTimeLogs(async (log: DeviceLog) => {
      if (isRealTimePaused) return;
      
      const empId = String(log.deviceUserId ?? log.userId ?? log.uid ?? "").trim();
      if (!empId || empId === "0") return;

      const txTime = parseHardwareTime(log);
      console.log(`[Device Engine] Real-time punch received: Employee ${empId} at ${formatWallClock(txTime)}`);

      try {
        await handleAttendance({
          employeeId: empId,
          timestamp: txTime,
          deviceIp: DEVICE_CONFIG.IP,
        });
      } catch (err: any) {
        console.error(`[Device Engine] Real-time punch processing failed for ${empId}:`, err.message);
      }
    });

    // Automatically attempt reconnect if the socket dies unexpectedly
    if (zk.zklibTcp && zk.zklibTcp.socket) {
      zk.zklibTcp.socket.on("close", () => {
        if (!isRealTimePaused) {
          console.warn("[Device Engine] Real-time socket closed unexpectedly. Reconnecting in 5s...");
          realTimeZk = null;
          setTimeout(startRealTimeListener, 5000);
        }
      });
    }
  } catch (err: any) {
    console.error("[Device Engine] Failed to start real-time listener:", err.message);
    realTimeZk = null;
    if (!isRealTimePaused) {
      console.log("[Device Engine] Retrying real-time connection in 10s...");
      setTimeout(startRealTimeListener, 10000);
    }
  }
};