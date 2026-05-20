import { prisma } from "../config/db";

export interface Schedule {
  id: number;
  checkInStart: string;
  checkInEnd: string;
  breakInStart: string;
  breakInEnd: string;
  breakOutStart: string;
  breakOutEnd: string;
  checkOutStart: string;
  checkOutEnd: string;
  minIntervalMinutes: number;
  halfDayMinutes: number;
  maxPunchesPerDay: number;
}

export const getSchedule = async (): Promise<Schedule> => {
  let schedule = await prisma.attendanceSchedule.findFirst();
  
  if (!schedule) {
    schedule = await prisma.attendanceSchedule.create({
      data: {
        checkInStart: process.env.DEFAULT_CHECK_IN_START || "09:00",
        checkInEnd: process.env.DEFAULT_CHECK_IN_END || "10:00",
        breakInStart: process.env.DEFAULT_BREAK_IN_START || "13:00",
        breakInEnd: process.env.DEFAULT_BREAK_IN_END || "14:00",
        breakOutStart: process.env.DEFAULT_BREAK_OUT_START || "14:00",
        breakOutEnd: process.env.DEFAULT_BREAK_OUT_END || "15:00",
        checkOutStart: process.env.DEFAULT_CHECK_OUT_START || "17:00",
        checkOutEnd: process.env.DEFAULT_CHECK_OUT_END || "18:00",
        minIntervalMinutes: parseInt(process.env.DEFAULT_MIN_INTERVAL || "5"),
        halfDayMinutes: parseInt(process.env.DEFAULT_HALF_DAY || "240"),
        maxPunchesPerDay: parseInt(process.env.DEFAULT_MAX_PUNCHES || "4"),
      },
    });
  }
  
  return schedule;
};

export const updateSchedule = async (data: Partial<Schedule>): Promise<Schedule> => {
  const schedule = await getSchedule();
  return prisma.attendanceSchedule.update({
    where: { id: schedule.id },
    data,
  });
};

export type PunchKind = 'IN' | 'OUT' | 'BREAK_IN' | 'BREAK_OUT';
export const validatePunch = async (
  employeeId: string,
  punchTime: Date,
  kind: PunchKind
): Promise<{ ok: boolean; message?: string; isOvertime?: boolean; isHalfDay?: boolean }> => {
  const schedule = await getSchedule();

  const startOfDay = new Date(punchTime);
  startOfDay.setHours(0, 0, 0, 0);

  const record = await prisma.workRecord.findFirst({
    where: {
      employeeId,
      date: startOfDay,
    }
  });

  if (record) {
    const punches = [record.checkIn, record.breakIn, record.breakOut, record.checkOut].filter(Boolean);
    if (punches.length >= schedule.maxPunchesPerDay) {
      return { ok: false, message: `Max punches per day (${schedule.maxPunchesPerDay}) exceeded` };
    }

    const lastPunch = punches[punches.length - 1];
    if (lastPunch) {
      const diffMins = (punchTime.getTime() - lastPunch.getTime()) / 60000;
      if (diffMins < schedule.minIntervalMinutes) {
        return { ok: false, message: `Punch too soon. Minimum interval is ${schedule.minIntervalMinutes} minutes` };
      }
    }
  }

  const toDateWithTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const d = new Date(punchTime);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  let startLimit: Date;
  let endLimit: Date;
  let isOvertime = false;
  let isHalfDay = false;

  switch (kind) {
    case 'IN':
      startLimit = toDateWithTime(schedule.checkInStart);
      endLimit = toDateWithTime(schedule.checkInEnd);
      if (punchTime < startLimit) {
        isOvertime = true; // early check-in
      } else if (punchTime > endLimit) {
        return { ok: false, message: `Check-in window closed at ${schedule.checkInEnd}` };
      }
      break;

    case 'BREAK_IN':
      startLimit = toDateWithTime(schedule.breakInStart);
      endLimit = toDateWithTime(schedule.breakInEnd);
      if (punchTime < startLimit) {
        return { ok: false, message: `Break not available until ${schedule.breakInStart}` };
      }
      if (punchTime > endLimit) {
        return { ok: false, message: `Break-in window closed at ${schedule.breakInEnd}` };
      }
      break;

    case 'BREAK_OUT':
      startLimit = toDateWithTime(schedule.breakOutStart);
      endLimit = toDateWithTime(schedule.breakOutEnd);
      if (punchTime < startLimit) {
        return { ok: false, message: `Cannot punch break-out before ${schedule.breakOutStart}` };
      }
      if (punchTime > endLimit) {
        return { ok: false, message: `Break-out window closed at ${schedule.breakOutEnd}` };
      }
      break;

    case 'OUT':
      startLimit = toDateWithTime(schedule.checkOutStart);
      endLimit = toDateWithTime(schedule.checkOutEnd);
      if (punchTime < startLimit) {
        return { ok: false, message: `Cannot check out before ${schedule.checkOutStart}` };
      }
      if (punchTime > endLimit) {
        isOvertime = true; 
      }
      break;
  }

  if (record?.checkIn && kind === 'OUT') {
    const workedMins = (punchTime.getTime() - record.checkIn.getTime()) / 60000;
    isHalfDay = workedMins < schedule.halfDayMinutes; // ✅ also fixed the logic (< not >=)
  }

  return { ok: true, isOvertime, isHalfDay };
};

// import { prisma } from "../config/db";

// export interface Schedule {
//   id: number;
//   checkInStart: string;   // e.g. "09:00" — earliest allowed check-in (overtime if before this)
//   checkInEnd: string;     // e.g. "10:30" — latest allowed check-in
//   breakOutStart: string;  // e.g. "13:00" — earliest break start
//   breakOutEnd: string;    // e.g. "14:00" — latest break start
//   breakInStart: string;   // e.g. "13:30" — earliest return from break
//   breakInEnd: string;     // e.g. "14:30" — latest return from break
//   checkOutStart: string;  // e.g. "17:00" — earliest checkout (overtime if after checkOutEnd)
//   checkOutEnd: string;    // e.g. "18:00" — latest checkout
//   minIntervalMinutes: number;
//   halfDayMinutes: number;
//   maxPunchesPerDay: number;
// }

// export const getSchedule = async (): Promise<Schedule> => {
//   let schedule = await prisma.attendanceSchedule.findFirst();

//   if (!schedule) {
//     schedule = await prisma.attendanceSchedule.create({
//       data: {
//         checkInStart:   process.env.DEFAULT_CHECK_IN_START    || "09:00",
//         checkInEnd:     process.env.DEFAULT_CHECK_IN_END      || "10:30",
//         breakOutStart:  process.env.DEFAULT_BREAK_OUT_START   || "13:00",
//         breakOutEnd:    process.env.DEFAULT_BREAK_OUT_END     || "14:00",
//         breakInStart:   process.env.DEFAULT_BREAK_IN_START    || "13:30",
//         breakInEnd:     process.env.DEFAULT_BREAK_IN_END      || "14:30",
//         checkOutStart:  process.env.DEFAULT_CHECK_OUT_START   || "17:00",
//         checkOutEnd:    process.env.DEFAULT_CHECK_OUT_END     || "18:00",
//         minIntervalMinutes: parseInt(process.env.DEFAULT_MIN_INTERVAL || "5"),
//         halfDayMinutes:     parseInt(process.env.DEFAULT_HALF_DAY     || "240"),
//         maxPunchesPerDay:   parseInt(process.env.DEFAULT_MAX_PUNCHES  || "4"),
//       },
//     });
//   }

//   return schedule;
// };

// export const updateSchedule = async (data: Partial<Schedule>): Promise<Schedule> => {
//   const schedule = await getSchedule();
//   return prisma.attendanceSchedule.update({
//     where: { id: schedule.id },
//     data,
//   });
// };

// // ─────────────────────────────────────────────────────────────
// //  Punch kind — derived automatically from punch sequence
// // ─────────────────────────────────────────────────────────────
// export type PunchKind = "CHECK_IN" | "BREAK_OUT" | "BREAK_IN" | "CHECK_OUT";

// export interface PunchValidation {
//   ok: boolean;
//   message?: string;
//   kind?: PunchKind;       // what this punch will be treated as
//   isOvertime?: boolean;
//   isHalfDay?: boolean;
// }

// /**
//  * Determine what the NEXT expected punch is for this employee today,
//  * then validate the incoming punch time against the schedule window.
//  *
//  * Sequence enforced:
//  *   (none)     → CHECK_IN
//  *   checkIn    → BREAK_OUT
//  *   breakOut   → BREAK_IN
//  *   breakIn    → CHECK_OUT
//  *   checkOut   → rejected (day complete)
//  *
//  * Overtime rules:
//  *   CHECK_IN before checkInStart  → isOvertime = true
//  *   CHECK_OUT after checkOutEnd   → isOvertime = true
//  *
//  * Half-day rule:
//  *   Worked minutes (checkIn → checkOut, excluding break) < halfDayMinutes
//  */
// export const validatePunch = async (
//   employeeId: string,
//   punchTime: Date,
//   _rawKind?: string,   // ignored — we derive kind from sequence
// ): Promise<PunchValidation> => {
//   const schedule = await getSchedule();

//   // ── helpers ──────────────────────────────────────────────
//   const toToday = (timeStr: string): Date => {
//     const [h, m] = timeStr.split(":").map(Number);
//     const d = new Date(punchTime);
//     d.setHours(h, m, 0, 0);
//     return d;
//   };

//   const checkInStart  = toToday(schedule.checkInStart);
//   const checkInEnd    = toToday(schedule.checkInEnd);
//   const breakOutStart = toToday(schedule.breakOutStart);
//   const breakOutEnd   = toToday(schedule.breakOutEnd);
//   const breakInStart  = toToday(schedule.breakInStart);
//   const breakInEnd    = toToday(schedule.breakInEnd);
//   const checkOutStart = toToday(schedule.checkOutStart);
//   const checkOutEnd   = toToday(schedule.checkOutEnd);

//   // ── fetch today's existing record ────────────────────────
//   const startOfDay = new Date(punchTime);
//   startOfDay.setHours(0, 0, 0, 0);

//   const record = await prisma.workRecord.findFirst({
//     where: { employeeId, date: startOfDay },
//   });

//   // ── derive next expected punch kind ──────────────────────
//   let kind: PunchKind;

//   if (!record || !record.checkIn) {
//     kind = "CHECK_IN";
//   } else if (!record.breakOut) {
//     kind = "BREAK_OUT";
//   } else if (!record.breakIn) {
//     kind = "BREAK_IN";
//   } else if (!record.checkOut) {
//     kind = "CHECK_OUT";
//   } else {
//     // All 4 punches already recorded
//     return {
//       ok: false,
//       message: "All punches for today are already complete.",
//     };
//   }

//   // ── min interval check (against last recorded punch) ─────
//   const punches = record
//     ? [record.checkIn, record.breakOut, record.breakIn, record.checkOut].filter(Boolean)
//     : [];
//   if (punches.length > 0) {
//     const lastPunch = punches[punches.length - 1] as Date;
//     const diffMins = (punchTime.getTime() - new Date(lastPunch).getTime()) / 60000;
//     if (diffMins < schedule.minIntervalMinutes) {
//       return {
//         ok: false,
//         message: `Too soon. Minimum interval between punches is ${schedule.minIntervalMinutes} minutes.`,
//       };
//     }
//   }

//   // ── validate against the schedule window for this kind ───
//   let isOvertime = false;
//   let isHalfDay  = false;

//   switch (kind) {
//     case "CHECK_IN": {
//       // Allow early check-in (overtime), but reject after checkInEnd
//       if (punchTime > checkInEnd) {
//         return {
//           ok: false,
//           message: `Check-in window closed at ${schedule.checkInEnd}. Contact admin.`,
//         };
//       }
//       if (punchTime < checkInStart) {
//         isOvertime = true; // arriving before office time = overtime
//       }
//       break;
//     }

//     case "BREAK_OUT": {
//       // Must be within break-out window
//       if (punchTime < breakOutStart) {
//         return {
//           ok: false,
//           message: `Too early for break. Break starts at ${schedule.breakOutStart}.`,
//         };
//       }
//       if (punchTime > breakOutEnd) {
//         return {
//           ok: false,
//           message: `Break-out window closed at ${schedule.breakOutEnd}.`,
//         };
//       }
//       break;
//     }

//     case "BREAK_IN": {
//       // Must be within break-in (return) window
//       if (punchTime < breakInStart) {
//         return {
//           ok: false,
//           message: `Too early to return from break. Return window starts at ${schedule.breakInStart}.`,
//         };
//       }
//       if (punchTime > breakInEnd) {
//         return {
//           ok: false,
//           message: `Break-in window closed at ${schedule.breakInEnd}. Marked as late return.`,
//           // still ok — just warn; machine.engine will record it
//           kind,
//           isOvertime: false,
//           isHalfDay: false,
//         };
//       }
//       break;
//     }

//     case "CHECK_OUT": {
//       // Allow early checkout but flag half-day; allow late checkout as overtime
//       if (punchTime < checkOutStart) {
//         // Early checkout — compute worked time
//         if (record?.checkIn) {
//           const breakMins =
//             record.breakOut && record.breakIn
//               ? (new Date(record.breakIn).getTime() - new Date(record.breakOut).getTime()) / 60000
//               : 0;
//           const workedMins =
//             (punchTime.getTime() - new Date(record.checkIn).getTime()) / 60000 - breakMins;
//           if (workedMins < schedule.halfDayMinutes) {
//             isHalfDay = true;
//           }
//         }
//       }
//       if (punchTime > checkOutEnd) {
//         isOvertime = true; // staying past office end = overtime
//       }
//       // Compute half-day for normal checkout too
//       if (!isHalfDay && record?.checkIn) {
//         const breakMins =
//           record.breakOut && record.breakIn
//             ? (new Date(record.breakIn).getTime() - new Date(record.breakOut).getTime()) / 60000
//             : 0;
//         const workedMins =
//           (punchTime.getTime() - new Date(record.checkIn).getTime()) / 60000 - breakMins;
//         if (workedMins < schedule.halfDayMinutes) {
//           isHalfDay = true;
//         }
//       }
//       break;
//     }
//   }

//   return { ok: true, kind, isOvertime, isHalfDay };
// };