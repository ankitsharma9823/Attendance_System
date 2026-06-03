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

let scheduleCache: Schedule | null = null;

export const loadScheduleCache = async (): Promise<void> => {
  let schedule = await prisma.attendanceSchedule.findFirst();
  
  if (!schedule) {
    schedule = await prisma.attendanceSchedule.create({
      data: {
        checkInStart: process.env.DEFAULT_CHECK_IN_START || "07:00",
        checkInEnd: process.env.DEFAULT_CHECK_IN_END || "10:30",
        breakOutStart: process.env.DEFAULT_BREAK_OUT_START || "12:30",
        breakOutEnd: process.env.DEFAULT_BREAK_OUT_END || "14:00",
        breakInStart: process.env.DEFAULT_BREAK_IN_START || "13:00",
        breakInEnd: process.env.DEFAULT_BREAK_IN_END || "14:30",
        checkOutStart: process.env.DEFAULT_CHECK_OUT_START || "17:00",
        checkOutEnd: process.env.DEFAULT_CHECK_OUT_END || "21:00",
        minIntervalMinutes: parseInt(process.env.DEFAULT_MIN_INTERVAL || "5"),
        halfDayMinutes: parseInt(process.env.DEFAULT_HALF_DAY || "240"),
        maxPunchesPerDay: parseInt(process.env.DEFAULT_MAX_PUNCHES || "4"),
      },
    });
  }
  scheduleCache = schedule;
};

export const getSchedule = async (): Promise<Schedule> => {
  if (!scheduleCache) {
    await loadScheduleCache();
  }
  return scheduleCache!;
};

export const updateSchedule = async (data: Partial<Schedule>): Promise<Schedule> => {
  const schedule = await getSchedule();
  const updated = await prisma.attendanceSchedule.update({
    where: { id: schedule.id },
    data,
  });
  scheduleCache = updated;
  return updated;
};

const calcWorkedHours = (
  checkIn: Date,
  breakOut: Date | null,
  breakIn: Date | null,
  lastPunch: Date,
): number => {
  if (breakOut && breakIn) {
    const morning = Math.max(0, breakOut.getTime() - checkIn.getTime());
    const afternoon = Math.max(0, lastPunch.getTime() - breakIn.getTime());
    return parseFloat(((morning + afternoon) / 3_600_000).toFixed(2));
  }
  return parseFloat((Math.max(0, lastPunch.getTime() - checkIn.getTime()) / 3_600_000).toFixed(2));
};

export const computeEarlyLeaveForIncompleteRecord = (
  record: { checkIn: Date | null; breakOut?: Date | null; breakIn?: Date | null },
  schedule: Schedule,
) => {
  if (!record.checkIn) {
    throw new Error('Incomplete record must include checkIn');
  }
  const punches = [record.checkIn, record.breakOut, record.breakIn].filter(
    (value): value is Date => Boolean(value),
  );

  const lastPunch = punches.reduce(
    (latest, current) =>
      current.getTime() > latest.getTime() ? current : latest,
    record.checkIn,
  );

  const totalHours = calcWorkedHours(
    record.checkIn,
    record.breakOut ?? null,
    record.breakIn ?? null,
    lastPunch,
  );

  const isHalfDay = totalHours * 60 < schedule.halfDayMinutes;

  return {
    status: isHalfDay ? 'HALF_DAY' : 'EARLY_LEAVE',
    isHalfDay,
    totalHours,
  };
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