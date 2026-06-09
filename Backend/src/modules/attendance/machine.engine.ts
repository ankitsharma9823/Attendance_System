// import prisma from "../../config/db";
// import {
//   validatePunch,
//   getSchedule,
//   type PunchKind,
// } from "../../services/schedule.service";

// interface AttendancePayload {
//   employeeId: string;
//   timestamp: Date;
//   deviceIp?: string;
// }

// const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

// export const isAttendanceTestMode = (): boolean => {
//   const v = (process.env.ATTENDANCE_TEST_MODE ?? "").trim().toLowerCase();
//   return v === "true" || v === "1" || v === "yes";
// };

// export const fromDeviceTime = (deviceDate: Date): Date => {
//   const y = deviceDate.getFullYear();
//   const m = deviceDate.getMonth();
//   const d = deviceDate.getDate();
//   const h = deviceDate.getHours();
//   const min = deviceDate.getMinutes();
//   const s = deviceDate.getSeconds();
//   return new Date(Date.UTC(y, m, d, h, min, s) - NEPAL_OFFSET_MS);
// };

// const fmtClock = (d: Date) =>
//   `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;

// const isNewer = (next: Date, prev: Date | null | undefined) =>
//   !prev || next.getTime() > new Date(prev).getTime();

// const calcHours = (
//   checkIn: Date,
//   breakOut: Date | null,
//   breakIn: Date | null,
//   checkOut: Date,
// ): number => {
//   if (breakOut && breakIn) {
//     const morning = breakOut.getTime() - checkIn.getTime();
//     const afternoon = checkOut.getTime() - breakIn.getTime();
//     return parseFloat(
//       ((Math.max(0, morning) + Math.max(0, afternoon)) / 3_600_000).toFixed(2),
//     );
//   }
//   return parseFloat(
//     ((checkOut.getTime() - checkIn.getTime()) / 3_600_000).toFixed(2),
//   );
// };

// const resolvePunchKind = (
//   record: Awaited<ReturnType<typeof prisma.workRecord.findUnique>> | null,
// ): PunchKind => {
//   if (!record) return "IN";
//   if (!record.breakOut) return "BREAK_IN";
//   if (!record.breakIn) return "BREAK_OUT";
//   return "OUT";
// };

// export const handleAttendance = async (
//   payload: AttendancePayload,
// ): Promise<boolean> => {
//   const { employeeId, timestamp, deviceIp } = payload;
//   const clock = fmtClock(timestamp);

//   // GATE 1: Employee exists?
//   const employee = await prisma.employee.findUnique({
//     where: { id: employeeId }
//   });
//   if (!employee) {
//     console.log(`[Engine] Gate 1 Failed: Emp ${employeeId} not found in DB. Dropping punch.`);
//     return false;
//   }

//   // GATE 2: Inside a window?
//   const localTime = fromDeviceTime(timestamp);
//   const schedule = await getSchedule();
  
//   const toMinutes = (timeStr: string) => {
//     const [h, m] = timeStr.split(":").map(Number);
//     return h * 60 + m;
//   };
//   const punchMins = localTime.getHours() * 60 + localTime.getMinutes();

//   let matchedWindow: "checkIn" | "breakOut" | "breakIn" | "checkOut" | null = null;
//   let isOvertime = false;
  
//   const checkInStart = toMinutes(schedule.checkInStart);
//   const checkInEnd = toMinutes(schedule.checkInEnd);
//   const breakOutStart = toMinutes(schedule.breakOutStart);
//   const breakOutEnd = toMinutes(schedule.breakOutEnd);
//   const breakInStart = toMinutes(schedule.breakInStart);
//   const breakInEnd = toMinutes(schedule.breakInEnd);
//   const checkOutStart = toMinutes(schedule.checkOutStart);
//   const checkOutEnd = toMinutes(schedule.checkOutEnd);
  
//   // checkInWindowOpen in spec corresponds to checkInStart. 
//   // checkInOnTime corresponds to checkInStart? The spec says:
//   // checkInWindowOpen: 07:00, checkInOnTime: 09:00, checkInWindowClose: 10:30.
//   // Wait, our DB has checkInStart and checkInEnd. Let's adapt.
//   // Assuming checkInStart = 07:00 (window open). We'll assume checkInOnTime is +2 hrs or we just use checkInEnd.
//   // Actually, we'll map spec to existing fields: 
//   // checkInStart = window open, checkInEnd = window close. 

//   if (punchMins >= checkInStart && punchMins <= checkInEnd) matchedWindow = "checkIn";
//   else if (punchMins >= breakOutStart && punchMins <= breakOutEnd) matchedWindow = "breakOut";
//   else if (punchMins >= breakInStart && punchMins <= breakInEnd) matchedWindow = "breakIn";
//   else if (punchMins >= checkOutStart && punchMins <= checkOutEnd) matchedWindow = "checkOut";
//   else if (punchMins >= checkOutStart - 30 && punchMins < checkOutStart) matchedWindow = "checkOut"; // early leave

//   if (!matchedWindow) {
//     console.log(`[Engine] Gate 2 Failed: Emp ${employeeId} punch at ${clock} outside all windows. Dropping.`);
//     return false;
//   }

//   // GATE 3: Slot already filled?
//   const startOfDay = fromDeviceTime(
//     new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 0, 0, 0),
//   );

//   const record = await prisma.workRecord.findUnique({
//     where: { employeeId_date: { employeeId, date: startOfDay } },
//   });

//   if (record && record[matchedWindow]) {
//     console.log(`[Engine] Gate 3 Failed: Emp ${employeeId} slot ${matchedWindow} already filled. Dropping.`);
//     return false;
//   }

//   // GATE 4: Sequence valid?
//   if (matchedWindow === "breakOut" && (!record || !record.checkIn)) {
//     console.log(`[Engine] Gate 4 Failed: breakOut requires checkIn.`);
//     return false;
//   }
//   if (matchedWindow === "breakIn" && (!record || !record.breakOut)) {
//     console.log(`[Engine] Gate 4 Failed: breakIn requires breakOut.`);
//     return false;
//   }
//   if (matchedWindow === "checkOut" && (!record || !record.checkIn)) {
//     console.log(`[Engine] Gate 4 Failed: checkOut requires checkIn.`);
//     return false;
//   }

//   // Compute and write
//   if (matchedWindow === "checkIn") {
//     // In our simplified schema, overtime is if punch < "09:00". Let's assume 09:00 is checkInEnd - grace? 
//     // Spec: before checkInOnTime -> PRESENT, overtime=true if before windowOpen.
//     const isLate = punchMins > checkInStart + 120; // 2 hours grace for 'on time' as a guess, or just use PRESENT
//     await prisma.workRecord.upsert({
//       where: { employeeId_date: { employeeId, date: startOfDay } },
//       create: {
//         employeeId, date: startOfDay, checkIn: localTime, 
//         status: isLate ? "LATE" : "PRESENT", deviceIp, isOvertime: punchMins < checkInStart
//       },
//       update: { checkIn: localTime } // Should not happen due to Gate 3
//     });
//   } 
//   else if (matchedWindow === "breakOut") {
//     await prisma.workRecord.update({
//       where: { id: record!.id },
//       data: { breakOut: localTime },
//     });
//   }
//   else if (matchedWindow === "breakIn") {
//     await prisma.workRecord.update({
//       where: { id: record!.id },
//       data: { breakIn: localTime },
//     });
//   }
//   else if (matchedWindow === "checkOut") {
//     const ci = new Date(record!.checkIn!);
//     const bo = record!.breakOut ? new Date(record!.breakOut) : null;
//     const bi = record!.breakIn ? new Date(record!.breakIn) : null;
//     const totalHours = calcHours(ci, bo, bi, localTime);
//     const workedMins = (localTime.getTime() - ci.getTime()) / 60000;
    
//     let isHalfDay = record!.isHalfDay;
//     if (workedMins < schedule.halfDayMinutes) {
//       isHalfDay = true;
//     }
    
//     // overtime if late checkout
//     const isOt = punchMins > checkOutStart + 60; // assumption: checkOutOnTime = checkOutStart + 1h
    
//     await prisma.workRecord.update({
//       where: { id: record!.id },
//       data: { 
//         checkOut: localTime, 
//         totalHours, 
//         isOvertime: isOt, 
//         isHalfDay 
//       },
//     });
//   }

//   console.log(`[Engine] Success: Emp ${employeeId} punch ${matchedWindow} at ${clock}`);
//   return true;
// };


import prisma from "../../config/db";
import { getSchedule } from "../../services/schedule.service";

interface AttendancePayload {
  employeeId: string;
  timestamp: Date;
  deviceIp?: string;
}

const OVERTIME_THRESHOLD_MINUTES = 30; 
const MAX_OVERTIME_MINUTES = 120;    

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

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

const toMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

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
      ((Math.max(0, morning) + Math.max(0, afternoon)) / 3600000).toFixed(2),
    );
  }
  return parseFloat(((checkOut.getTime() - checkIn.getTime()) / 3600000).toFixed(2));
};

export const handleAttendance = async (
  payload: AttendancePayload,
): Promise<boolean> => {
  const { employeeId, timestamp, deviceIp } = payload;
  const clock = fmtClock(timestamp);

  // GATE 1: Verify Employee
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });
  if (!employee) {
    console.log(`[Engine] Gate 1 Failed: Emp ${employeeId} not found. Dropping.`);
    return false;
  }

  // GATE 2: Route Time to Windows
  const localTime = fromDeviceTime(timestamp);
  const schedule = await getSchedule();
  const punchMins = localTime.getHours() * 60 + localTime.getMinutes();

  let matchedWindow: "checkIn" | "breakOut" | "breakIn" | "checkOut" | null = null;

  const checkInStart = toMinutes(schedule.checkInStart);
  const checkInEnd = toMinutes(schedule.checkInEnd);
  const breakOutStart = toMinutes(schedule.breakOutStart);
  const breakOutEnd = toMinutes(schedule.breakOutEnd);
  const breakInStart = toMinutes(schedule.breakInStart);
  const breakInEnd = toMinutes(schedule.breakInEnd);
  const checkOutStart = toMinutes(schedule.checkOutStart);
  const checkOutEnd = toMinutes(schedule.checkOutEnd);

  if (punchMins >= checkInStart && punchMins <= checkInEnd) {
    matchedWindow = "checkIn";
  } else if (punchMins >= breakOutStart && punchMins <= breakOutEnd) {
    matchedWindow = "breakOut";
  } else if (punchMins >= breakInStart && punchMins <= breakInEnd) {
    matchedWindow = "breakIn";
  } else if (punchMins >= checkOutStart - 120 && punchMins <= checkOutEnd + 360) {
    // Extended checkout tracking boundary limits to allow for early exits or late overtime shifts
    matchedWindow = "checkOut";
  }

  if (!matchedWindow) {
    console.log(`[Engine] Gate 2 Failed: Punch at ${clock} outside windows. Dropping.`);
    return false;
  }

  // GATE 3: Sequence and Allocation Guards
  const startOfDay = fromDeviceTime(
    new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 0, 0, 0),
  );

  const record = await prisma.workRecord.findUnique({
    where: { employeeId_date: { employeeId, date: startOfDay } },
  });

  if (record && record[matchedWindow]) {
    console.log(`[Engine] Gate 3 Failed: Slot ${matchedWindow} already filled. Dropping.`);
    return false;
  }

  if (matchedWindow === "breakOut" && (!record || !record.checkIn)) return false;
  if (matchedWindow === "breakIn" && (!record || !record.breakOut)) return false;
  if (matchedWindow === "checkOut" && (!record || !record.checkIn)) return false;

  // Process Operations
  if (matchedWindow === "checkIn") {
    const isLate = punchMins > (checkInStart + 15); // 15-minute standard grace buffer
    await prisma.workRecord.upsert({
      where: { employeeId_date: { employeeId, date: startOfDay } },
      create: {
        employeeId,
        date: startOfDay,
        checkIn: localTime,
        status: isLate ? "LATE" : "PRESENT",
        deviceIp,
      },
      update: { checkIn: localTime },
    });
  } 
  else if (matchedWindow === "breakOut") {
    await prisma.workRecord.update({
      where: { id: record!.id },
      data: { breakOut: localTime },
    });
  }
  else if (matchedWindow === "breakIn") {
    await prisma.workRecord.update({
      where: { id: record!.id },
      data: { breakIn: localTime },
    });
  }
  else if (matchedWindow === "checkOut") {
    const ci = new Date(record!.checkIn!);
    const bo = record!.breakOut ? new Date(record!.breakOut) : null;
    const bi = record!.breakIn ? new Date(record!.breakIn) : null;

    const totalHours = calcHours(ci, bo, bi, localTime);
    const workedMins = totalHours * 60;

    // Shift Performance State Evaluator
    let calculatedStatus = "PRESENT";
    if (punchMins < checkOutStart) {
      calculatedStatus = "EARLY_LEAVE";
    } else if (record!.status === "LATE") {
      calculatedStatus = "LATE";
    }

    // Checking if total active time is less than halfDayMinutes field in your schedule object
    if (workedMins < (schedule.halfDayMinutes || 240)) {
      calculatedStatus = "HALF_DAY";
    }

    // Explicit Overtime Quantifier Logic
    let overtimeMinutes = 0;
    const shiftEndTargetMins = checkOutStart; 
    if (punchMins > shiftEndTargetMins) {
      const excessMinutes = punchMins - shiftEndTargetMins;
      
      // Using fallback constants here to prevent type checking compilation failures
      if (excessMinutes >= OVERTIME_THRESHOLD_MINUTES) {
        overtimeMinutes = Math.min(excessMinutes, MAX_OVERTIME_MINUTES);
      }
    }

    await prisma.workRecord.update({
      where: { id: record!.id },
      data: {
        checkOut: localTime,
        totalHours,
        status: calculatedStatus,
        overtime: overtimeMinutes,
      },
    });
  }

  console.log(`[Engine] Success: Emp ${employeeId} punch ${matchedWindow} at ${clock}`);
  return true;
};

// Periodic Cron System Hook to clean unresolved daily check-ins
export const evaluateEndOfDayMissingPunches = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const incompleteRecords = await prisma.workRecord.findMany({
    where: {
      date: startOfToday,
      checkIn: { not: null },
      checkOut: null,
    },
  });

  for (const record of incompleteRecords) {
    await prisma.workRecord.update({
      where: { id: record.id },
      data: {
        status: "HALF_DAY", 
        totalHours: 4.0,
        overtime: 0,
      },
    });
  }
};