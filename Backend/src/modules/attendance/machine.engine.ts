import prisma from "../../config/db";

interface AttendancePayload {
  employeeId: string;
  timestamp: Date;
  type: "IN" | "OUT" | "BREAK_IN" | "BREAK_OUT";
  deviceIp?: string;
  isOvertime?: boolean;
  isHalfDay?: boolean;
}

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

export const isAttendanceTestMode = (): boolean => {
  const v = (process.env.ATTENDANCE_TEST_MODE ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
};

/** Device logs use Nepal wall-clock; normalize regardless of server timezone. */
export const fromDeviceTime = (deviceDate: Date): Date => {
  const y = deviceDate.getFullYear();
  const m = deviceDate.getMonth();
  const d = deviceDate.getDate();
  const h = deviceDate.getHours();
  const min = deviceDate.getMinutes();
  const s = deviceDate.getSeconds();
  return new Date(Date.UTC(y, m, d, h, min, s) - NEPAL_OFFSET_MS);
};

const formatDeviceClock = (deviceTime: Date) =>
  `${deviceTime.getHours()}:${deviceTime.getMinutes().toString().padStart(2, "0")}`;

const isNewerThan = (next: Date, prev: Date | null | undefined) =>
  !prev || next.getTime() > new Date(prev).getTime();

/** Worked hours minus break gap: (breakOut−checkIn) + (checkOut−breakIn) */
const calcHoursWithBreak = (
  checkIn: Date,
  breakOut: Date,
  breakIn: Date,
  checkOut: Date,
): number => {
  const morning = breakOut.getTime() - checkIn.getTime();
  const afternoon = checkOut.getTime() - breakIn.getTime();
  const total = Math.max(0, morning) + Math.max(0, afternoon);
  return parseFloat((total / (1000 * 60 * 60)).toFixed(2));
};

/**
 * Test mode (ATTENDANCE_TEST_MODE=true): 4 punches per day
 * 1 → check-in (e.g. 7:30)
 * 2 → break-out / left for break (e.g. 7:33)
 * 3 → break-in / back from break (e.g. 7:35)
 * 4 → check-out (e.g. 7:37)
 */
const handleTestModePunches = async (
  employeeId: string,
  localTime: Date,
  deviceWallClock: Date,
  startOfDay: Date,
  deviceIp: string | undefined,
  existing: Awaited<ReturnType<typeof prisma.workRecord.findUnique>>,
): Promise<boolean> => {
  const clock = formatDeviceClock(deviceWallClock);

  if (!existing) {
    await prisma.workRecord.create({
      data: {
        employeeId,
        date: startOfDay,
        checkIn: localTime,
        status: "PRESENT",
        deviceIp,
      },
    });
    console.log(`[Engine] Emp ${employeeId} punch 1/4 — Check-in at ${clock}`);
    return true;
  }

  const checkIn = existing.checkIn ? new Date(existing.checkIn) : null;
  const breakOut = existing.breakOut ? new Date(existing.breakOut) : null;
  const breakIn = existing.breakIn ? new Date(existing.breakIn) : null;
  const checkOut = existing.checkOut ? new Date(existing.checkOut) : null;

  if (!breakOut && checkIn && isNewerThan(localTime, checkIn)) {
    await prisma.workRecord.update({
      where: { id: existing.id },
      data: { breakOut: localTime },
    });
    console.log(`[Engine] Emp ${employeeId} punch 2/4 — Break-out (left for break) at ${clock}`);
    return true;
  }

  if (breakOut && !breakIn && isNewerThan(localTime, breakOut)) {
    await prisma.workRecord.update({
      where: { id: existing.id },
      data: { breakIn: localTime },
    });
    console.log(`[Engine] Emp ${employeeId} punch 3/4 — Break-in (back from break) at ${clock}`);
    return true;
  }

  if (breakIn && checkIn && breakOut && isNewerThan(localTime, breakIn)) {
    const totalHours = calcHoursWithBreak(checkIn, breakOut, breakIn, localTime);
    await prisma.workRecord.update({
      where: { id: existing.id },
      data: {
        checkOut: localTime,
        totalHours,
      },
    });
    console.log(
      `[Engine] Emp ${employeeId} punch 4/4 — Check-out at ${clock} (${totalHours}h worked, break excluded)`,
    );
    return true;
  }

  if (checkOut && isNewerThan(localTime, checkOut)) {
    const totalHours =
      checkIn && breakOut && breakIn
        ? calcHoursWithBreak(checkIn, breakOut, breakIn, localTime)
        : existing.totalHours;
    await prisma.workRecord.update({
      where: { id: existing.id },
      data: { checkOut: localTime, totalHours },
    });
    console.log(`[Engine] Emp ${employeeId} — Check-out updated at ${clock}`);
    return true;
  }

  console.log(`[Engine] Skipped Emp ${employeeId} at ${clock} — duplicate or out-of-order punch`);
  return false;
};

/** Production: check-in → check-out */
const handleStandardPunches = async (
  employeeId: string,
  localTime: Date,
  startOfDay: Date,
  deviceIp: string | undefined,
  record: NonNullable<Awaited<ReturnType<typeof prisma.workRecord.findUnique>>>,
  isOvertime?: boolean,
  isHalfDay?: boolean,
): Promise<boolean> => {
  const hours = localTime.getHours();
  const minutes = localTime.getMinutes();
  const totalMinutesPastMidnight = hours * 60 + minutes;

  const SHIFT_START_MINUTES = 10 * 60;
  const GRACE_PERIOD_MINUTES = 15;
  const LATE_LIMIT_MINUTES = 12 * 60;
  const MAX_CHECKIN_MINUTES = 13 * 60 + 30;

  const checkInTime = record.checkIn ? new Date(record.checkIn) : null;
  const checkOutTime = record.checkOut ? new Date(record.checkOut) : null;

  if (checkInTime && localTime.getTime() <= checkInTime.getTime()) {
    console.log(`[Engine] Skipped Emp ${employeeId} — duplicate or older than check-in.`);
    return false;
  }

  if (!checkOutTime) {
    let computedHours = 0;
    if (checkInTime) {
      computedHours = parseFloat(
        ((localTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2),
      );
    }

    await prisma.workRecord.update({
      where: { id: record.id },
      data: { checkOut: localTime, totalHours: computedHours > 0 ? computedHours : 0 },
    });
    console.log(`[Engine] Clock-Out saved for Emp ${employeeId} at ${hours}:${minutes} (${computedHours}h)`);
    return true;
  }

  if (localTime.getTime() <= checkOutTime.getTime()) {
    console.log(`[Engine] Skipped Emp ${employeeId} — duplicate or older than check-out.`);
    return false;
  }

  const computedHours = checkInTime
    ? parseFloat(((localTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2))
    : 0;

  await prisma.workRecord.update({
    where: { id: record.id },
    data: { 
      checkOut: localTime, 
      totalHours: computedHours > 0 ? computedHours : record.totalHours ?? 0,
      isOvertime: isOvertime ?? record.isOvertime,
      isHalfDay: isHalfDay ?? record.isHalfDay,
    },
  });
  console.log(`[Engine] Check-out updated for Emp ${employeeId} at ${hours}:${minutes}`);
  return true;
};

export const handleAttendance = async (payload: AttendancePayload): Promise<boolean> => {
  const { employeeId, timestamp, deviceIp, isOvertime, isHalfDay } = payload;

  const localTime = fromDeviceTime(timestamp);
  const startOfDay = fromDeviceTime(
    new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 0, 0, 0),
  );

  const hours = timestamp.getHours();
  const minutes = timestamp.getMinutes();
  const totalMinutesPastMidnight = hours * 60 + minutes;
  const testMode = isAttendanceTestMode();

  let record = await prisma.workRecord.findUnique({
    where: { employeeId_date: { employeeId, date: startOfDay } },
  });

  if (testMode) {
    return handleTestModePunches(employeeId, localTime, timestamp, startOfDay, deviceIp, record);
  }

  if (!record) {
    if (totalMinutesPastMidnight > 13 * 60 + 30) {
      console.log(`[Engine] Check-in denied for Emp ${employeeId} after 13:30.`);
      return false;
    }

    let status = "PRESENT";
    if (totalMinutesPastMidnight > 10 * 60 + 15) {
      status = totalMinutesPastMidnight <= 12 * 60 ? "LATE" : "HALF_DAY";
    }

    await prisma.workRecord.create({
      data: {
        employeeId,
        date: startOfDay,
        checkIn: localTime,
        status,
        deviceIp,
        isOvertime: isOvertime ?? false,
        isHalfDay: isHalfDay ?? false,
      },
    });
    console.log(`[Engine] Clock-In saved for Emp ${employeeId} at ${hours}:${minutes} [${status}]`);
    return true;
  }

  return handleStandardPunches(employeeId, localTime, startOfDay, deviceIp, record, isOvertime, isHalfDay);
};

// import prisma from "../../config/db";
// import type { PunchKind } from "../../services/schedule.service";

// interface AttendancePayload {
//   employeeId: string;
//   timestamp: Date;
//   type: "IN" | "OUT";       // raw from ZKTeco device
//   deviceIp?: string;
//   isOvertime?: boolean;
//   isHalfDay?: boolean;
//   kind?: PunchKind;          // resolved by validatePunch in schedule.service
// }

// const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

// export const isAttendanceTestMode = (): boolean => {
//   const v = (process.env.ATTENDANCE_TEST_MODE ?? "").trim().toLowerCase();
//   return v === "true" || v === "1" || v === "yes";
// };

// /** Device logs store Nepal wall-clock time. Convert to UTC for DB storage. */
// export const fromDeviceTime = (deviceDate: Date): Date => {
//   return new Date(
//     Date.UTC(
//       deviceDate.getFullYear(),
//       deviceDate.getMonth(),
//       deviceDate.getDate(),
//       deviceDate.getHours(),
//       deviceDate.getMinutes(),
//       deviceDate.getSeconds(),
//     ) - NEPAL_OFFSET_MS,
//   );
// };

// const fmtClock = (d: Date) =>
//   `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;

// const isNewer = (next: Date, prev: Date | null | undefined) =>
//   !prev || next.getTime() > new Date(prev).getTime();

// /** Worked hours excluding break: (breakOut−checkIn) + (checkOut−breakIn) */
// const calcHours = (
//   checkIn: Date,
//   breakOut: Date | null,
//   breakIn: Date | null,
//   checkOut: Date,
// ): number => {
//   if (breakOut && breakIn) {
//     const morning   = breakOut.getTime() - checkIn.getTime();
//     const afternoon = checkOut.getTime() - breakIn.getTime();
//     return parseFloat(((Math.max(0, morning) + Math.max(0, afternoon)) / 3_600_000).toFixed(2));
//   }
//   return parseFloat(((checkOut.getTime() - checkIn.getTime()) / 3_600_000).toFixed(2));
// };

// // ─────────────────────────────────────────────────────────────
// //  TEST MODE  (ATTENDANCE_TEST_MODE=true)
// //  Accepts 4 punches in sequence regardless of time windows:
// //  1 → check-in   2 → break-out   3 → break-in   4 → check-out
// // ─────────────────────────────────────────────────────────────
// const handleTestMode = async (
//   employeeId: string,
//   localTime: Date,
//   deviceWallClock: Date,
//   startOfDay: Date,
//   deviceIp: string | undefined,
//   record: Awaited<ReturnType<typeof prisma.workRecord.findUnique>>,
// ): Promise<boolean> => {
//   const clock = fmtClock(deviceWallClock);

//   if (!record) {
//     await prisma.workRecord.create({
//       data: { employeeId, date: startOfDay, checkIn: localTime, status: "PRESENT", deviceIp },
//     });
//     console.log(`[Engine][TEST] ${employeeId} — CHECK-IN at ${clock}`);
//     return true;
//   }

//   const ci  = record.checkIn  ? new Date(record.checkIn)  : null;
//   const bo  = record.breakOut ? new Date(record.breakOut) : null;
//   const bi  = record.breakIn  ? new Date(record.breakIn)  : null;
//   const co  = record.checkOut ? new Date(record.checkOut) : null;

//   if (!bo && ci && isNewer(localTime, ci)) {
//     await prisma.workRecord.update({ where: { id: record.id }, data: { breakOut: localTime } });
//     console.log(`[Engine][TEST] ${employeeId} — BREAK-OUT at ${clock}`);
//     return true;
//   }
//   if (bo && !bi && isNewer(localTime, bo)) {
//     await prisma.workRecord.update({ where: { id: record.id }, data: { breakIn: localTime } });
//     console.log(`[Engine][TEST] ${employeeId} — BREAK-IN at ${clock}`);
//     return true;
//   }
//   if (bi && ci && bo && isNewer(localTime, bi)) {
//     const totalHours = calcHours(ci, bo, bi, localTime);
//     await prisma.workRecord.update({
//       where: { id: record.id },
//       data: { checkOut: localTime, totalHours },
//     });
//     console.log(`[Engine][TEST] ${employeeId} — CHECK-OUT at ${clock} (${totalHours}h)`);
//     return true;
//   }
//   if (co && isNewer(localTime, co)) {
//     const totalHours = ci && bo && bi ? calcHours(ci, bo, bi, localTime) : record.totalHours;
//     await prisma.workRecord.update({
//       where: { id: record.id },
//       data: { checkOut: localTime, totalHours: totalHours ?? 0 },
//     });
//     console.log(`[Engine][TEST] ${employeeId} — CHECK-OUT updated at ${clock}`);
//     return true;
//   }

//   console.log(`[Engine][TEST] ${employeeId} — skipped duplicate at ${clock}`);
//   return false;
// };

// // ─────────────────────────────────────────────────────────────
// //  PRODUCTION MODE
// //  Uses the validated PunchKind from schedule.service to decide
// //  which field to write. One punch per slot, sequence enforced.
// // ─────────────────────────────────────────────────────────────
// export const handleAttendance = async (payload: AttendancePayload): Promise<boolean> => {
//   const { employeeId, timestamp, deviceIp, isOvertime, isHalfDay, kind } = payload;

//   const localTime  = fromDeviceTime(timestamp);
//   const startOfDay = fromDeviceTime(
//     new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 0, 0, 0),
//   );
//   const clock = fmtClock(timestamp); // Nepal wall clock for logs

//   const record = await prisma.workRecord.findUnique({
//     where: { employeeId_date: { employeeId, date: startOfDay } },
//   });

//   // ── TEST MODE ────────────────────────────────────────────
//   if (isAttendanceTestMode()) {
//     return handleTestMode(employeeId, localTime, timestamp, startOfDay, deviceIp, record);
//   }

//   // ── PRODUCTION MODE ──────────────────────────────────────
//   // kind is resolved by validatePunch — if missing fall back to legacy IN/OUT logic
//   switch (kind) {
//     // ── CHECK-IN ──────────────────────────────────────────
//     case "CHECK_IN": {
//       if (record) {
//         console.log(`[Engine] ${employeeId} — check-in already exists, skipping.`);
//         return false;
//       }

//       const h   = timestamp.getHours();
//       const m   = timestamp.getMinutes();
//       const tot = h * 60 + m;
//       let status = "PRESENT";
//       if (tot > 10 * 60 + 15) status = tot <= 12 * 60 ? "LATE" : "HALF_DAY";

//       await prisma.workRecord.create({
//         data: {
//           employeeId,
//           date: startOfDay,
//           checkIn: localTime,
//           status,
//           deviceIp,
//           isOvertime: isOvertime ?? false,
//           isHalfDay:  isHalfDay  ?? false,
//         },
//       });
//       console.log(`[Engine] ${employeeId} — CHECK-IN at ${clock} [${status}]${isOvertime ? " +OT" : ""}`);
//       return true;
//     }

//     // ── BREAK-OUT (left for break) ─────────────────────────
//     case "BREAK_OUT": {
//       if (!record) {
//         console.log(`[Engine] ${employeeId} — no check-in found, skipping break-out.`);
//         return false;
//       }
//       if (record.breakOut) {
//         console.log(`[Engine] ${employeeId} — break-out already recorded, skipping.`);
//         return false;
//       }
//       await prisma.workRecord.update({
//         where: { id: record.id },
//         data: { breakOut: localTime },
//       });
//       console.log(`[Engine] ${employeeId} — BREAK-OUT at ${clock}`);
//       return true;
//     }

//     // ── BREAK-IN (returned from break) ────────────────────
//     case "BREAK_IN": {
//       if (!record?.breakOut) {
//         console.log(`[Engine] ${employeeId} — no break-out found, skipping break-in.`);
//         return false;
//       }
//       if (record.breakIn) {
//         console.log(`[Engine] ${employeeId} — break-in already recorded, skipping.`);
//         return false;
//       }
//       await prisma.workRecord.update({
//         where: { id: record.id },
//         data: { breakIn: localTime },
//       });
//       console.log(`[Engine] ${employeeId} — BREAK-IN at ${clock}`);
//       return true;
//     }

//     // ── CHECK-OUT ─────────────────────────────────────────
//     case "CHECK_OUT": {
//       if (!record?.checkIn) {
//         console.log(`[Engine] ${employeeId} — no check-in found, skipping check-out.`);
//         return false;
//       }
//       if (record.checkOut && !isNewer(localTime, record.checkOut)) {
//         console.log(`[Engine] ${employeeId} — duplicate check-out, skipping.`);
//         return false;
//       }

//       const ci = new Date(record.checkIn);
//       const bo = record.breakOut ? new Date(record.breakOut) : null;
//       const bi = record.breakIn  ? new Date(record.breakIn)  : null;
//       const totalHours = calcHours(ci, bo, bi, localTime);

//       await prisma.workRecord.update({
//         where: { id: record.id },
//         data: {
//           checkOut: localTime,
//           totalHours,
//           isOvertime: isOvertime ?? record.isOvertime,
//           isHalfDay:  isHalfDay  ?? record.isHalfDay,
//         },
//       });
//       console.log(
//         `[Engine] ${employeeId} — CHECK-OUT at ${clock} (${totalHours}h)${isOvertime ? " +OT" : ""}${isHalfDay ? " HALF-DAY" : ""}`,
//       );
//       return true;
//     }

//     // ── FALLBACK (no kind — legacy IN/OUT from device) ────
//     default: {
//       if (!record) {
//         const h   = timestamp.getHours();
//         const m   = timestamp.getMinutes();
//         const tot = h * 60 + m;
//         if (tot > 13 * 60 + 30) {
//           console.log(`[Engine] ${employeeId} — check-in denied after 13:30.`);
//           return false;
//         }
//         let status = "PRESENT";
//         if (tot > 10 * 60 + 15) status = tot <= 12 * 60 ? "LATE" : "HALF_DAY";

//         await prisma.workRecord.create({
//           data: { employeeId, date: startOfDay, checkIn: localTime, status, deviceIp },
//         });
//         console.log(`[Engine] ${employeeId} — CHECK-IN (fallback) at ${clock} [${status}]`);
//         return true;
//       }

//       // Existing record — treat as check-out update
//       if (!isNewer(localTime, record.checkOut ?? record.checkIn)) {
//         console.log(`[Engine] ${employeeId} — duplicate punch (fallback), skipping.`);
//         return false;
//       }

//       const ci = record.checkIn ? new Date(record.checkIn) : null;
//       const bo = record.breakOut ? new Date(record.breakOut) : null;
//       const bi = record.breakIn  ? new Date(record.breakIn)  : null;
//       const totalHours = ci ? calcHours(ci, bo, bi, localTime) : 0;

//       await prisma.workRecord.update({
//         where: { id: record.id },
//         data: { checkOut: localTime, totalHours },
//       });
//       console.log(`[Engine] ${employeeId} — CHECK-OUT (fallback) at ${clock} (${totalHours}h)`);
//       return true;
//     }
//   }
// };