import prisma from "../../config/db";

export interface Log {
  employeeId: string;
  timestamp: string | Date;
  type?: "IN" | "OUT";
  deviceIp?: string;
}

// ── All times are Nepal local (UTC+5:45) ─────────────────────────────────────

// Check-in windows
const CHECKIN_PRESENT_START = 10;   // 10:00 — earliest valid check-in
const CHECKIN_PRESENT_END   = 12;   // 10:00–11:59 = PRESENT
const CHECKIN_LATE_END      = 13;   // 12:00–12:59 = LATE
const CHECKIN_HALFDAY_END_H = 13;   // 13:00–13:29 = HALF_DAY
const CHECKIN_HALFDAY_END_M = 40;   // block at 13:30
const CHECKIN_BLOCK_H       = 13;
const CHECKIN_BLOCK_M       = 30;

// Break rules
const BREAK_ALLOWED_AFTER_H = 14;   // break only allowed after 14:00
const BREAK_MAX_DURATION_MIN = 70;  // must return within 1hr10min or auto-checkout

// Checkout window
const CHECKOUT_START_H      = 16;   // earliest valid checkout: 16:00
const OT_START_H            = 17;
const OT_START_M            = 10;   // OT after 17:10

const toNepalTime = (date: Date): Date => {
  const nepalOffsetMs = (5 * 60 + 45) * 60000;
  return new Date(date.getTime() + nepalOffsetMs);
};

const toNepalMinutes = (date: Date): number => {
  const np = toNepalTime(date);
  return np.getUTCHours() * 60 + np.getUTCMinutes();
};

export const handleAttendance = async (log: Log): Promise<void> => {
  const { employeeId, timestamp } = log;

  if (!timestamp || !employeeId) return;

  const rawTime = timestamp instanceof Date ? timestamp : new Date(timestamp);

  if (isNaN(rawTime.getTime())) {
    console.error(`❌ Invalid timestamp for employee ${employeeId}: ${timestamp}`);
    return;
  }

  // Nepal time for logic only — never stored in DB
  const logTime    = toNepalTime(rawTime);
  const hour       = logTime.getUTCHours();
  const minute     = logTime.getUTCMinutes();
  const totalMins  = hour * 60 + minute; // Nepal minutes since midnight
  const dbTime     = rawTime;            // always store original UTC

  // Nepal calendar date as UTC midnight
  const logDate = new Date(Date.UTC(
    logTime.getUTCFullYear(),
    logTime.getUTCMonth(),
    logTime.getUTCDate(),
    0, 0, 0, 0
  ));

  console.log(
    `[Attendance] Processing: emp=${employeeId} nepal_time=${logTime.toISOString()} hour=${hour}:${String(minute).padStart(2,"0")} date=${logDate.toISOString().slice(0, 10)}`
  );

  // ── Employee lookup / auto-create ─────────────────────────────────────────
  let employee = await prisma.employee.findUnique({ where: { id: employeeId } });

  if (!employee) {
    console.warn(`⚠️  Employee ${employeeId} not in DB — auto-creating.`);
    try {
      employee = await prisma.employee.create({
        data: { id: employeeId, name: `Employee ${employeeId}`, department: null },
      });
    } catch (createErr: any) {
      employee = await prisma.employee.findUnique({ where: { id: employeeId } });
      if (!employee) {
        console.error(`❌ Could not create employee ${employeeId}:`, createErr?.message);
        return;
      }
    }
  }

  const record = await prisma.workRecord.findUnique({
    where: { employeeId_date: { employeeId, date: logDate } },
  });

  // ── Already fully checked out ─────────────────────────────────────────────
  if (record?.checkOut) {
    console.log(`[Attendance] Already checked out for ${employeeId} — skipping.`);
    return;
  }

  // ── STAGE 1: No record yet — this is a check-in ───────────────────────────
  if (!record) {
    // Too early — before 10:00
    if (hour < CHECKIN_PRESENT_START) {
      console.log(`🚫 Too early to check in for ${employeeId} at ${hour}:${String(minute).padStart(2,"0")}`);
      return;
    }

    // Blocked — after 13:30
    const blockMins = CHECKIN_BLOCK_H * 60 + CHECKIN_BLOCK_M;
    if (totalMins >= blockMins) {
      console.log(`🚫 Check-in blocked for ${employeeId} at ${hour}:${String(minute).padStart(2,"0")} (after 13:30)`);
      return;
    }

    // Determine status by check-in time
    let status: string;
    if (hour < CHECKIN_PRESENT_END) {
      status = "PRESENT";                          // 10:00–11:59
    } else if (hour < CHECKIN_LATE_END) {
      status = "LATE";                             // 12:00–12:59
    } else {
      status = "HALF_DAY";                         // 13:00–13:29
    }

    await prisma.workRecord.create({
      data: { employeeId, date: logDate, status, checkIn: dbTime, overtime: 0 },
    });

    console.log(`✅ Check-in recorded for ${employeeId} at ${hour}:${String(minute).padStart(2,"0")} — ${status}`);
    return;
  }

  // ── Duplicate scan guard ──────────────────────────────────────────────────
  // Ignore exact or near-duplicate punches (within 2 min of any recorded time)
  if (record.checkIn) {
    const nepalCheckIn = toNepalTime(new Date(record.checkIn));
    const minutesSinceCheckIn = (logTime.getTime() - nepalCheckIn.getTime()) / 60000;

    // Ignore only if punch is VERY close to check-in (within 2 min) — likely duplicate
    if (minutesSinceCheckIn >= 0 && minutesSinceCheckIn < 2) {
      console.log(
        `⏭️  Duplicate check-in ignored for ${employeeId} (${Math.floor(minutesSinceCheckIn)}min since check-in)`
      );
      return;
    }
  }

  // Also check near break-out/break-in for duplicates
  if (record.breakOut) {
    const nepalBreakOut = toNepalTime(new Date(record.breakOut));
    const minutesSinceBreakOut = (logTime.getTime() - nepalBreakOut.getTime()) / 60000;

    if (minutesSinceBreakOut >= 0 && minutesSinceBreakOut < 2) {
      console.log(`⏭️  Duplicate break-out ignored for ${employeeId}`);
      return;
    }
  }

  if (record.breakIn) {
    const nepalBreakIn = toNepalTime(new Date(record.breakIn));
    const minutesSinceBreakIn = (logTime.getTime() - nepalBreakIn.getTime()) / 60000;

    if (minutesSinceBreakIn >= 0 && minutesSinceBreakIn < 2) {
      console.log(`⏭️  Duplicate break-in ignored for ${employeeId}`);
      return;
    }
  }

  if (record.checkOut) {
    const nepalCheckOut = toNepalTime(new Date(record.checkOut));
    const minutesSinceCheckOut = (logTime.getTime() - nepalCheckOut.getTime()) / 60000;

    if (minutesSinceCheckOut >= 0 && minutesSinceCheckOut < 2) {
      console.log(`⏭️  Duplicate checkout ignored for ${employeeId}`);
      return;
    }
  }

  let updateData: any  = {};
  let finalStatus      = record.status ?? "PRESENT";

  // ── STAGE 2: Break logic (only allowed after 14:00) ───────────────────────
  if (totalMins >= BREAK_ALLOWED_AFTER_H * 60) {

    // No break started yet — start break
    if (!record.breakOut) {
      updateData.breakOut = dbTime;
      console.log(`☕ Break started for ${employeeId} at ${hour}:${String(minute).padStart(2,"0")}`);

    // Break started but not returned yet — this is break return
    } else if (!record.breakIn) {
      const breakStartNepal  = toNepalTime(new Date(record.breakOut));
      const breakDurationMin = (logTime.getTime() - breakStartNepal.getTime()) / 60000;

      if (breakDurationMin > BREAK_MAX_DURATION_MIN) {
        // Overstayed break — treat as checkout
        updateData.breakIn  = dbTime;
        updateData.checkOut = dbTime;
        finalStatus         = "EARLY_LEAVE";
        console.log(
          `⚠️  Break overstayed ${Math.floor(breakDurationMin)}min for ${employeeId} — auto checkout`
        );
      } else {
        updateData.breakIn = dbTime;
        console.log(`🔙 Break ended for ${employeeId} (${Math.floor(breakDurationMin)}min break)`);
      }

    // Break already done — this is checkout
    } else {
      if (totalMins < CHECKOUT_START_H * 60) {
        // Trying to checkout before 16:00 after break — early leave
        updateData.checkOut = dbTime;
        finalStatus         = "EARLY_LEAVE";
        console.log(`⚠️  Early leave (post-break) for ${employeeId} at ${hour}:${String(minute).padStart(2,"0")}`);
      } else {
        updateData.checkOut = dbTime;

        // OT calculation
        const otStartMins = OT_START_H * 60 + OT_START_M;
        if (totalMins > otStartMins) {
          updateData.overtime = totalMins - otStartMins;
          console.log(`⏱️  OT ${updateData.overtime}min for ${employeeId}`);
        }

        console.log(`🚪 Checkout for ${employeeId} at ${hour}:${String(minute).padStart(2,"0")}`);
      }
    }

  // ── STAGE 3: Checkout window (16:00+) no break taken ─────────────────────
  } else if (totalMins >= CHECKOUT_START_H * 60) {
    updateData.checkOut = dbTime;

    const otStartMins = OT_START_H * 60 + OT_START_M;
    if (totalMins > otStartMins) {
      updateData.overtime = totalMins - otStartMins;
      console.log(`⏱️  OT ${updateData.overtime}min for ${employeeId}`);
    }

    console.log(`🚪 Checkout for ${employeeId} at ${hour}:${String(minute).padStart(2,"0")}`);

  // ── STAGE 4: Punch between check-in and 14:00 — early leave ──────────────
  } else {
    updateData.checkOut = dbTime;
    finalStatus         = "EARLY_LEAVE";
    console.log(`⚠️  Early leave for ${employeeId} at ${hour}:${String(minute).padStart(2,"0")}`);
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.workRecord.update({
      where: { id: record.id },
      data: { ...updateData, status: finalStatus },
    });
  }
};