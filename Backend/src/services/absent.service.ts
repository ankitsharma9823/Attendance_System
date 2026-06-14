// import { prisma } from "../config/db";
// import { getSchedule, computeEarlyLeaveForIncompleteRecord } from "./schedule.service";

// // Nepal offset (+05:45)
// const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

// const getNepalTime = (): Date => {
//   return new Date(Date.now() + NEPAL_OFFSET_MS);
// };

// export const runAbsentBackfill = async () => {
//   console.log("[Absent Job] Starting daily absent backfill job...");
  
//   const now = getNepalTime();
//   const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

//   if (dayOfWeek === 6 || dayOfWeek === 0) {
//     console.log("[Absent Job] Today is a weekend. Skipping backfill.");
//     return;
//   }

//   const startOfDayUtc = new Date(
//     Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
//   );

//   const holiday = await prisma.holiday.findFirst({
//     where: {
//       startDate: { lte: startOfDayUtc },
//       endDate: { gte: startOfDayUtc }
//     }
//   });

//   if (holiday) {
//     console.log(`[Absent Job] Today is a holiday: ${holiday.reason ?? 'holiday'}. Skipping backfill.`);
//     return;
//   }

//   const schedule = await getSchedule();
//   const incompleteRecords = await prisma.workRecord.findMany({
//     where: {
//       date: startOfDayUtc,
//       checkIn: { not: null },
//       checkOut: null,
//     },
//   });

//   if (incompleteRecords.length > 0) {
//     let finalized = 0;
//     for (const record of incompleteRecords) {
//       const { status, isHalfDay, totalHours } = computeEarlyLeaveForIncompleteRecord(record, schedule);
//       await prisma.workRecord.update({
//         where: { id: record.id },
//         data: {
//           status,
//           isHalfDay,
//           totalHours,
//           isOvertime: false,
//         },
//       });
//       finalized++;
//     }
//     console.log(`[Absent Job] Finalized ${finalized} incomplete record(s) as EARLY_LEAVE/HALF_DAY.`);
//   }

//   const employees = await prisma.employee.findMany({
//     where: { isActive: true }
//   });

//   let absentCount = 0;

//   for (const emp of employees) {
//     const record = await prisma.workRecord.findUnique({
//       where: {
//         employeeId_date: {
//           employeeId: emp.id,
//           date: startOfDayUtc
//         }
//       }
//     });

//     if (!record) {
//       await prisma.workRecord.create({
//         data: {
//           employeeId: emp.id,
//           date: startOfDayUtc,
//           status: "ABSENT",
//           totalHours: 0,
//         }
//       });
//       absentCount++;
//     }
//   }

//   console.log(`[Absent Job] Backfill complete. Marked ${absentCount} employees as ABSENT.`);
// };

// export const scheduleAbsentJob = () => {
//   const checkAndRun = () => {
//     const now = getNepalTime();
//     // 23:30 Nepal time
//     if (now.getUTCHours() === 23 && now.getUTCMinutes() === 30) {
//       runAbsentBackfill().catch(console.error);
//     }
//   };

//   // Check every minute
//   setInterval(checkAndRun, 60000);
//   console.log("[System Scheduler] Absent backfill job scheduled for 23:30 Nepal time.");
// };


import { prisma } from "../config/db";
import { getSchedule } from "./schedule.service";

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

const getNepalTime = (): Date => {
  return new Date(Date.now() + NEPAL_OFFSET_MS);
};

const getNepalStartOfDay = (now: Date): Date => {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0) - NEPAL_OFFSET_MS
  );
};

export const runAbsentBackfill = async () => {
  console.log("[Absent Job] Starting daily absent backfill job...");

  const now = getNepalTime();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 6=Sat

  // Only skip Saturday
  if (dayOfWeek === 6) {
    console.log("[Absent Job] Today is Saturday. Skipping backfill.");
    return;
  }

  const startOfDay = getNepalStartOfDay(now);

  // Check public holiday
  const holiday = await prisma.holiday.findFirst({
    where: {
      startDate: { lte: startOfDay },
      endDate: { gte: startOfDay },
    }
  });

  if (holiday) {
    console.log(`[Absent Job] Today is a holiday: ${holiday.reason ?? "holiday"}. Skipping backfill.`);
    return;
  }

  const schedule = await getSchedule();

  // Finalize incomplete records (checkIn but no checkOut)
  const incompleteRecords = await prisma.workRecord.findMany({
    where: {
      date: startOfDay,
      checkIn: { not: null },
      checkOut: null,
      status: { not: "LEAVE" },
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
  console.log(`[Absent Job] Finalized ${incompleteRecords.length} incomplete record(s) as HALF_DAY.`);

  // Mark absent for employees with no record at all
  const employees = await prisma.employee.findMany({
    where: { isActive: true }
  });

  let absentCount = 0;
  for (const emp of employees) {
    const record = await prisma.workRecord.findUnique({
      where: { employeeId_date: { employeeId: emp.id, date: startOfDay } }
    });

    if (!record) {
      await prisma.workRecord.create({
        data: {
          employeeId: emp.id,
          date: startOfDay,
          status: "ABSENT",
          totalHours: 0,
          overtime: 0,
        }
      });
      absentCount++;
    }
  }

  console.log(`[Absent Job] Backfill complete. Marked ${absentCount} employee(s) as ABSENT.`);
};

export const scheduleAbsentJob = () => {
  const checkAndRun = () => {
    const now = getNepalTime();
    // Run at 23:30 Nepal time
    if (now.getUTCHours() === 23 && now.getUTCMinutes() === 30) {
      runAbsentBackfill().catch(console.error);
    }
  };

  setInterval(checkAndRun, 60000);
  console.log("[System Scheduler] Absent backfill job scheduled for 23:30 Nepal time.");
};