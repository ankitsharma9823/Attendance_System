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
  return new Date(
    Date.UTC(
      deviceDate.getFullYear(),
      deviceDate.getMonth(),
      deviceDate.getDate(),
      deviceDate.getHours(),
      deviceDate.getMinutes(),
      deviceDate.getSeconds(),
    ) - NEPAL_OFFSET_MS,
  );
};

const getNepalStartOfDay = (deviceDate: Date): Date => {
  return new Date(
    Date.UTC(
      deviceDate.getFullYear(),
      deviceDate.getMonth(),
      deviceDate.getDate(),
      0, 0, 0,
    ) - NEPAL_OFFSET_MS,
  );
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
  return parseFloat(
    ((checkOut.getTime() - checkIn.getTime()) / 3600000).toFixed(2),
  );
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

  const localTime = fromDeviceTime(timestamp);
  const punchMins = timestamp.getHours() * 60 + timestamp.getMinutes();

  const schedule = await getSchedule();

  const checkInStart  = toMinutes(schedule.checkInStart);
  const checkInEnd    = toMinutes(schedule.checkInEnd);
  const breakOutStart = toMinutes(schedule.breakOutStart);
  const breakOutEnd   = toMinutes(schedule.breakOutEnd);
  const breakInStart  = toMinutes(schedule.breakInStart);
  const breakInEnd    = toMinutes(schedule.breakInEnd);
  const checkOutStart = toMinutes(schedule.checkOutStart);
  const checkOutEnd   = toMinutes(schedule.checkOutEnd);

  // Nepal calendar date used as the unique day key in DB
  const startOfDay = getNepalStartOfDay(timestamp);

  // Fetch existing record once — reused across all gates and processing
  const record = await prisma.workRecord.findUnique({
    where: { employeeId_date: { employeeId, date: startOfDay } },
  });

  // GATE 2: Match punch to a time window using both time and record state
  let matchedWindow: "checkIn" | "breakOut" | "breakIn" | "checkOut" | null = null;

  if (punchMins >= checkInStart && punchMins <= checkInEnd) {
    matchedWindow = "checkIn";

  } else if (punchMins >= breakOutStart && punchMins <= breakOutEnd) {
    if (record?.checkIn) {
      matchedWindow = "breakOut";
    } else {
      matchedWindow = "checkIn";
      console.log(`[Engine] Gate 2: Punch in breakOut window but no checkIn yet. Treating as late check-in.`);
    }

  } else if (punchMins >= breakInStart && punchMins <= breakInEnd) {
    if (record?.breakOut) {
      matchedWindow = "breakIn";
    } else if (record?.checkIn) {
      matchedWindow = "checkOut";
      console.log(`[Engine] Gate 2: Punch in breakIn window but no breakOut. Treating as checkOut.`);
    } else {
      matchedWindow = "checkIn";
      console.log(`[Engine] Gate 2: Punch in breakIn window but no checkIn. Treating as late check-in.`);
    }

  } else if (punchMins >= checkOutStart - 120 && punchMins <= checkOutEnd + 360) {
    matchedWindow = "checkOut";

  } else {
    if (!record) {
      matchedWindow = "checkIn";
      console.log(`[Engine] Gate 2: No record today, treating punch at ${clock} as late check-in.`);
    } else if (record.checkIn && !record.breakOut && !record.checkOut && punchMins < breakOutStart) {
      matchedWindow = "checkOut";
      console.log(`[Engine] Gate 2: Early checkout detected for ${employeeId} at ${clock}.`);
    } else {
      console.log(`[Engine] Gate 2 Failed: Punch at ${clock} (${punchMins}m) outside all windows. Dropping.`);
      return false;
    }
  }

  // GATE 3: Slot already filled guard
  if (record && record[matchedWindow]) {
    console.log(`[Engine] Gate 3 Failed: Slot ${matchedWindow} already filled for ${employeeId}. Dropping.`);
    return false;
  }

  const approvedLeave = await prisma.holiday.findFirst({
    where: {
      employeeId,
      status: "APPROVED",
      startDate: { lte: startOfDay },
      endDate:   { gte: startOfDay },
    },
  });
  if (approvedLeave) {
    console.log(`[Engine] Gate 4 Failed: ${employeeId} is on approved leave today. Punch dropped.`);
    return false;
  }

  if (matchedWindow === "breakOut" && (!record || !record.checkIn)) {
    console.log(`[Engine] Sequence guard: breakOut attempted without checkIn. Dropping.`);
    return false;
  }
  if (matchedWindow === "breakIn" && (!record || !record.breakOut)) {
    console.log(`[Engine] Sequence guard: breakIn attempted without breakOut. Dropping.`);
    return false;
  }
  if (matchedWindow === "checkOut" && (!record || !record.checkIn)) {
    console.log(`[Engine] Sequence guard: checkOut attempted without checkIn. Dropping.`);
    return false;
  }

  if (matchedWindow === "checkIn") {
    const graceEndMins = checkInStart + 30; // 15 min grace from schedule's checkInStart

    let checkInStatus: string;
    if (punchMins <= graceEndMins) {
      checkInStatus = "PRESENT";
    } else {
      checkInStatus = "LATE";
    }

    await prisma.workRecord.upsert({
      where: { employeeId_date: { employeeId, date: startOfDay } },
      create: {
        employeeId,
        date: startOfDay,
        checkIn: localTime,
        status: checkInStatus,
        deviceIp,
      },
      update: { checkIn: localTime },
    });

  } else if (matchedWindow === "breakOut") {
    await prisma.workRecord.update({
      where: { id: record!.id },
      data: { breakOut: localTime },
    });

  } else if (matchedWindow === "breakIn") {
    await prisma.workRecord.update({
      where: { id: record!.id },
      data: { breakIn: localTime },
    });

  } else if (matchedWindow === "checkOut") {
    const ci = new Date(record!.checkIn!);
    const bo = record!.breakOut ? new Date(record!.breakOut) : null;
    const bi = record!.breakIn  ? new Date(record!.breakIn)  : null;

    const totalHours = calcHours(ci, bo, bi, localTime);
    const workedMins = totalHours * 60;

    // Preserve LATE status set at check-in if no worse condition applies
    let calculatedStatus = record!.status === "LATE" ? "LATE" : "PRESENT";

    // EARLY_LEAVE overrides LATE
    if (punchMins < checkOutStart) {
      calculatedStatus = "EARLY_LEAVE";
    }

    // HALF_DAY overrides everything — worked too few hours regardless of timing
    if (workedMins < schedule.halfDayMinutes) {
      calculatedStatus = "HALF_DAY";
    }

    let overtimeMinutes = 0;
    if (punchMins > checkOutStart) {
      const excessMinutes = punchMins - checkOutStart;
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

  console.log(`[Engine] ✅ Success: Emp ${employeeId} → ${matchedWindow} at ${clock}`);
  return true;
};

// Cron hook: runs at end of day to clean up incomplete records
export const evaluateEndOfDayMissingPunches = async () => {
  const startOfToday = getNepalStartOfDay(new Date());
  const schedule = await getSchedule();

  // Resolve abandoned breaks — employee broke out but never came back
  const abandonedBreaks = await prisma.workRecord.findMany({
    where: {
      date: startOfToday,
      checkIn:  { not: null },
      breakOut: { not: null },
      breakIn:  null,
      checkOut: null,
      status:   { not: "LEAVE" },
    },
  });

  for (const record of abandonedBreaks) {
    const ci = new Date(record.checkIn!);
    const bo = new Date(record.breakOut!);
    const totalHours = parseFloat(
      ((bo.getTime() - ci.getTime()) / 3600000).toFixed(2),
    );
    const workedMins = totalHours * 60;

    await prisma.workRecord.update({
      where: { id: record.id },
      data: {
        checkOut: bo,
        totalHours,
        status: workedMins < schedule.halfDayMinutes ? "HALF_DAY" : "EARLY_LEAVE",
        overtime: 0,
      },
    });
  }

  console.log(`[Engine] End-of-day sweep: resolved ${abandonedBreaks.length} abandoned break(s) as checkOut.`);

  // Mark remaining incomplete check-ins as HALF_DAY
  const incompleteRecords = await prisma.workRecord.findMany({
    where: {
      date:    startOfToday,
      checkIn: { not: null },
      checkOut: null,
      status:  { not: "LEAVE" },
    },
  });

  for (const record of incompleteRecords) {
    await prisma.workRecord.update({
      where: { id: record.id },
      data: {
        status:     "HALF_DAY",
        totalHours: 4.0,
        overtime:   0,
      },
    });
  }

  console.log(`[Engine] End-of-day sweep: marked ${incompleteRecords.length} incomplete record(s) as HALF_DAY.`);
};