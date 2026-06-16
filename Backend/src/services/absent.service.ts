import cron from "node-cron";
import { prisma } from "../config/db";

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

const getNepalStartOfDay = (now: Date): Date => {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0) - NEPAL_OFFSET_MS
  );
};

export const runAbsentBackfill = async () => {
  console.log("[Absent Job] Starting daily absent backfill job...");

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat

  if (dayOfWeek === 6) {
    console.log("[Absent Job] Today is Saturday. Skipping backfill.");
    return;
  }

  const startOfDay = getNepalStartOfDay(now);

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
  cron.schedule("30 23 * * 1-5", runAbsentBackfill, {
    timezone: "Asia/Kathmandu",
  });
  console.log("[System Scheduler] Absent backfill job scheduled for 23:30 Nepal time (Mon-Fri).");
};