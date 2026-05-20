import prisma from "../../config/db";
import {
  validatePunch,
  getSchedule,
  type PunchKind,
} from "../../services/schedule.service";

interface AttendancePayload {
  employeeId: string;
  timestamp: Date;
  deviceIp?: string;
}

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

export const isAttendanceTestMode = (): boolean => {
  const v = (process.env.ATTENDANCE_TEST_MODE ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
};

export const fromDeviceTime = (deviceDate: Date): Date => {
  const y = deviceDate.getFullYear();
  const m = deviceDate.getMonth();
  const d = deviceDate.getDate();
  const h = deviceDate.getHours();
  const min = deviceDate.getMinutes();
  const s = deviceDate.getSeconds();
  return new Date(Date.UTC(y, m, d, h, min, s) - NEPAL_OFFSET_MS);
};

const fmtClock = (d: Date) =>
  `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;

const isNewer = (next: Date, prev: Date | null | undefined) =>
  !prev || next.getTime() > new Date(prev).getTime();

const calcHours = (
  checkIn: Date,
  breakOut: Date | null,
  breakIn: Date | null,
  checkOut: Date,
): number => {
  if (breakOut && breakIn) {
    const morning = breakOut.getTime() - checkIn.getTime();
    const afternoon = checkOut.getTime() - breakIn.getTime();
    return parseFloat(
      ((Math.max(0, morning) + Math.max(0, afternoon)) / 3_600_000).toFixed(2),
    );
  }
  return parseFloat(
    ((checkOut.getTime() - checkIn.getTime()) / 3_600_000).toFixed(2),
  );
};

const resolvePunchKind = (
  record: Awaited<ReturnType<typeof prisma.workRecord.findUnique>> | null,
): PunchKind => {
  if (!record) return "IN";
  if (!record.breakOut) return "BREAK_IN";
  if (!record.breakIn) return "BREAK_OUT";
  return "OUT";
};

export const handleAttendance = async (
  payload: AttendancePayload,
): Promise<boolean> => {
  const { employeeId, timestamp, deviceIp } = payload;

  const localTime = fromDeviceTime(timestamp);
  const startOfDay = fromDeviceTime(
    new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate(),
      0,
      0,
      0,
    ),
  );
  const clock = fmtClock(timestamp);
  const testMode = isAttendanceTestMode();

  const schedule = await getSchedule();

  const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const checkInStartMins = toMinutes(schedule.checkInStart);
  const checkInEndMins = toMinutes(schedule.checkInEnd);
  const checkOutStartMins = toMinutes(schedule.checkOutStart);
  const checkOutEndMins = toMinutes(schedule.checkOutEnd);

  const record = await prisma.workRecord.findUnique({
    where: { employeeId_date: { employeeId, date: startOfDay } },
  });

  const kind = resolvePunchKind(record);

  if (!testMode) {
    const validation = await validatePunch(employeeId, localTime, kind);
    if (!validation.ok) {
      console.log(
        `[Engine] Emp ${employeeId} punch REJECTED (${kind}): ${validation.message}`,
      );
      return false;
    }
  }

  const punchNum = { IN: 1, BREAK_IN: 2, BREAK_OUT: 3, OUT: 4 }[kind];
  const punchLabel = {
    IN: "Check-in",
    BREAK_IN: "Break-out (left for break)",
    BREAK_OUT: "Break-in (back from break)",
    OUT: "Check-out",
  }[kind];

  switch (kind) {
    case "IN": {
      const tot = timestamp.getHours() * 60 + timestamp.getMinutes();

      // ✅ Only deny check-in after checkOutEnd (not checkOutStart)
      if (tot > checkOutEndMins) {
        console.log(
          `[Engine] Emp ${employeeId} — check-in denied after ${schedule.checkOutEnd}`,
        );
        return false;
      }

      const GRACE = 15;
      let status = "PRESENT";
      if (tot > checkInEndMins + GRACE) {
        status = "HALF_DAY";
      } else if (tot > checkInEndMins) {
        status = "LATE";
      }

      const isOvertime = tot < checkInStartMins; // early punch

      await prisma.workRecord.create({
        data: {
          employeeId,
          date: startOfDay,
          checkIn: localTime,
          status,
          deviceIp,
          isOvertime,
        },
      });
      break;
    }

    case "BREAK_IN": {
      if (!record) return false;
      await prisma.workRecord.update({
        where: { id: record.id },
        data: { breakOut: localTime },
      });
      break;
    }

    case "BREAK_OUT": {
      if (!record) return false;
      await prisma.workRecord.update({
        where: { id: record.id },
        data: { breakIn: localTime },
      });
      break;
    }

    case "OUT": {
      if (!record?.checkIn) return false;
      const ci = new Date(record.checkIn);
      const bo = record.breakOut ? new Date(record.breakOut) : null;
      const bi = record.breakIn ? new Date(record.breakIn) : null;
      const totalHours = calcHours(ci, bo, bi, localTime);

      const tot = timestamp.getHours() * 60 + timestamp.getMinutes();
      const isOvertime = tot > checkOutEndMins; // ✅ late punch = overtime

      const workedMins = (localTime.getTime() - ci.getTime()) / 60000;
      const isHalfDay = workedMins < schedule.halfDayMinutes;

      await prisma.workRecord.update({
        where: { id: record.id },
        data: { checkOut: localTime, totalHours, isOvertime, isHalfDay },
      });
      break;
    }
  }

  console.log(
    `[Engine] Emp ${employeeId} punch ${punchNum}/4 — ${punchLabel} at ${clock}`,
  );
  return true;
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
