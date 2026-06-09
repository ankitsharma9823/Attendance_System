// import moment from "moment-timezone";
// import { getSchedule } from "./schedule.service"; // Schedule cache service
// import { io } from "../server"; // Socket.IO instance
// import { prisma } from "../config/db"; // Prisma client

// /**
//  * Core punch handling implementing the 4‑gate algorithm described in the spec.
//  * Called by the device controller for every biometric scan.
//  */
// export class PunchService {
//   /**
//    * Process a raw punch from the device.
//    * @param employeeId string coming from the device
//    * @param timestamp ISO string (UTC) sent by the device
//    */
//   async handlePunch(employeeId: string, timestamp: string) {
//     // ---------- Gate 1 – Employee existence ----------
//     const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
//     if (!employee) return { success: false, message: "Employee not found" };

//     // ---------- Convert timestamp to Nepal local time ----------
//     const utcMoment = moment.utc(timestamp);
//     const local = utcMoment.tz("Asia/Kathmandu");
//     const minutesOfDay = local.hours() * 60 + local.minutes();

//     // ---------- Load cached schedule ----------
//     const schedule = await getSchedule();
//     const toMins = (t: string) => {
//       const [h, m] = t.split(":").map(Number);
//       return h * 60 + m;
//     };

//     // Determine which window this punch belongs to (or null)
//     let matchedWindow: "checkIn" | "breakOut" | "breakIn" | "checkOut" | null = null;
//     if (minutesOfDay >= toMins(schedule.checkInStart) && minutesOfDay <= toMins(schedule.checkInEnd)) {
//       matchedWindow = "checkIn";
//     } else if (minutesOfDay >= toMins(schedule.breakOutStart) && minutesOfDay <= toMins(schedule.breakOutEnd)) {
//       matchedWindow = "breakOut";
//     } else if (minutesOfDay >= toMins(schedule.breakInStart) && minutesOfDay <= toMins(schedule.breakInEnd)) {
//       matchedWindow = "breakIn";
//     } else if (minutesOfDay >= toMins(schedule.checkOutStart) && minutesOfDay <= toMins(schedule.checkOutEnd)) {
//       matchedWindow = "checkOut";
//     }

//     // ---------- Gate 2 – Inside a window? ----------
//     if (!matchedWindow) {
//       // silent drop – return generic success for device
//       return { success: true };
//     }

//     // ---------- Helper: get today's work record ----------
//     const startOfDay = local.clone().startOf("day");
//     const dateUTC = startOfDay.toDate(); // stored as UTC midnight

//     const existing = await prisma.workRecord.findUnique({
//       where: { employeeId_date: { employeeId, date: dateUTC } },
//     });

//     // ---------- Gate 3 – Slot already filled? ----------
//     if (existing) {
//       const slotFilled =
//         (matchedWindow === "checkIn" && existing.checkIn) ||
//         (matchedWindow === "breakOut" && existing.breakOut) ||
//         (matchedWindow === "breakIn" && existing.breakIn) ||
//         (matchedWindow === "checkOut" && existing.checkOut);
//       if (slotFilled) return { success: true };
//     }

//     // ---------- Gate 4 – Sequence validation ----------
//     if (matchedWindow === "breakOut" && !existing?.checkIn) return { success: true };
//     if (matchedWindow === "breakIn" && !existing?.breakOut) return { success: true };
//     if (matchedWindow === "checkOut" && !existing?.checkIn) return { success: true };

//     // ---------- Compute status / overtime ----------
//     let status = "PRESENT";
//     let isOvertime = false;
//     const checkInOnTime = toMins(schedule.checkInEnd);
//     const checkOutOnTime = toMins(schedule.checkOutEnd);
//     const earlyLeaveMins = 0; // no early‑leave config yet
//     const halfDayMins = schedule.halfDayMinutes;

//     if (matchedWindow === "checkIn") {
//       isOvertime = minutesOfDay < toMins(schedule.checkInStart);
//       status = minutesOfDay > checkInOnTime ? "LATE" : "PRESENT";
//     }

//     // ---------- Upsert work record ----------
//     const upsertData: any = {
//       employeeId,
//       date: dateUTC,
//       deviceIp: "unknown",
//     };

//     if (matchedWindow === "checkIn") {
//       upsertData.checkIn = local.toDate();
//       upsertData.status = status;
//       upsertData.isOvertime = isOvertime;
//     } else if (matchedWindow === "breakOut") {
//       upsertData.breakOut = local.toDate();
//     } else if (matchedWindow === "breakIn") {
//       upsertData.breakIn = local.toDate();
//     } else if (matchedWindow === "checkOut") {
//       upsertData.checkOut = local.toDate();
//       // Compute totalHours and final status
//       const checkIn = existing?.checkIn ?? upsertData.checkIn;
//       if (checkIn) {
//         const diffMs = local.toDate().getTime() - new Date(checkIn).getTime();
//         let totalHours = diffMs / 1000 / 3600;
//         const bo = existing?.breakOut ?? upsertData.breakOut;
//         const bi = existing?.breakIn ?? upsertData.breakIn;
//         if (bo && bi) {
//           const breakMs = new Date(bi).getTime() - new Date(bo).getTime();
//           totalHours -= breakMs / 1000 / 3600;
//         }
//         upsertData.totalHours = Math.max(0, totalHours);
//         if (minutesOfDay < toMins(schedule.checkOutStart) - earlyLeaveMins) status = "EARLY_LEAVE";
//         if (upsertData.totalHours * 60 < halfDayMins) status = "HALF_DAY";
//         if (minutesOfDay > checkOutOnTime) isOvertime = true;
//         upsertData.status = status;
//         upsertData.isOvertime = isOvertime;
//       }
//     }

//     await prisma.workRecord.upsert({
//       where: { employeeId_date: { employeeId, date: dateUTC } },
//       create: upsertData,
//       update: upsertData,
//     });

//     // Emit real‑time update via Socket.IO
//     try {
//       io.emit("deviceStatus", { employeeId, date: dateUTC, status: upsertData.status ?? status });
//     } catch (err) {
//       console.error("[PunchService] Socket emit error:", err);
//     }

//     return { success: true };
//   }
// }

// export const punchService = new PunchService();

import moment from "moment-timezone";
import { getSchedule } from "./schedule.service"; 
import { io } from "../server"; 
import { prisma } from "../config/db"; 

export class PunchService {
  async handlePunch(employeeId: string, timestamp: string) {
    // ---------- Gate 1: Entity Existence Check ----------
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return { success: false, message: "Employee entity record missing" };

    // ---------- Normalize Time Context (Asia/Kathmandu) ----------
    const utcMoment = moment.utc(timestamp);
    const local = utcMoment.tz("Asia/Kathmandu");
    const minutesOfDay = local.hours() * 60 + local.minutes();

    // ---------- Fetch Live Active Shift Bounds ----------
    const schedule = await getSchedule();
    const toMins = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const startOfDay = local.clone().startOf("day");
    const dateUTC = startOfDay.toDate(); 

    // Look for a pre-existing transaction row today
    const existing = await prisma.workRecord.findUnique({
      where: { employeeId_date: { employeeId, date: dateUTC } },
    });

    // ---------- Chronological State Sequence Switchboard ----------
    let matchedWindow: "checkIn" | "breakOut" | "breakIn" | "checkOut" | null = null;

    if (!existing) {
      // 1st interaction is explicitly registered as Check-In
      matchedWindow = "checkIn";
    } else if (schedule.maxPunchesPerDay === 2) {
      // If Break tracking is disabled globally, the 2nd interaction completes the work day
      matchedWindow = "checkOut";
    } else {
      // Break tracking is active (Max punches = 4). Evaluate holes sequentially.
      if (existing.checkIn && !existing.breakOut && !existing.checkOut) {
        
        // Differentiate early departure from structural lunch breaks
        const breakStartMins = toMins(schedule.breakOutStart);
        if (minutesOfDay < breakStartMins) {
          // 🎯 User punched BEFORE break time window opens. Route as early Check-Out!
          matchedWindow = "checkOut";
        } else {
          // Otherwise, it falls under the standard lunch pipeline
          matchedWindow = "breakOut";
        }
        
      } else if (existing.breakOut && !existing.breakIn) {
        matchedWindow = "breakIn";
      } else if (existing.breakIn && !existing.checkOut) {
        matchedWindow = "checkOut";
      }
    }

    // ---------- Gate 2 & 3: Anti-Corruption Structural Drops ----------
    if (!matchedWindow) {
      return { success: true }; // Silent bypass for sequential error prevention
    }

    if (existing) {
      const isOverwriting =
        (matchedWindow === "checkIn" && existing.checkIn) ||
        (matchedWindow === "breakOut" && existing.breakOut) ||
        (matchedWindow === "breakIn" && existing.breakIn) ||
        (matchedWindow === "checkOut" && existing.checkOut);
      if (isOverwriting) return { success: true }; // Safeguard existing target data properties
    }

    // ---------- Metrical Assembly & Calculations ----------
    let status = "PRESENT";
    let isOvertime = false;
    const checkInOnTime = toMins(schedule.checkInEnd);
    const checkOutOnTime = toMins(schedule.checkOutEnd);
    const halfDayMins = schedule.halfDayMinutes;

    if (matchedWindow === "checkIn") {
      isOvertime = minutesOfDay < toMins(schedule.checkInStart);
      status = minutesOfDay > checkInOnTime ? "LATE" : "PRESENT";
    }

    const upsertData: any = {
      employeeId,
      date: dateUTC,
      deviceIp: "biometric-hardware",
    };

    if (matchedWindow === "checkIn") {
      upsertData.checkIn = local.toDate();
      upsertData.status = status;
      upsertData.isOvertime = isOvertime;
    } else if (matchedWindow === "breakOut") {
      upsertData.breakOut = local.toDate();
    } else if (matchedWindow === "breakIn") {
      upsertData.breakIn = local.toDate();
    } else if (matchedWindow === "checkOut") {
      upsertData.checkOut = local.toDate();
      
      const checkIn = existing?.checkIn ?? upsertData.checkIn;
      if (checkIn) {
        const diffMs = local.toDate().getTime() - new Date(checkIn).getTime();
        let totalHours = diffMs / 1000 / 3600;
        
        // Dynamically deduct break gaps only if both entries are logged
        const bo = existing?.breakOut ?? upsertData.breakOut;
        const bi = existing?.breakIn ?? upsertData.breakIn;
        if (bo && bi) {
          const breakMs = new Date(bi).getTime() - new Date(bo).getTime();
          totalHours -= breakMs / 1000 / 3600;
        }
        
        upsertData.totalHours = Math.max(0, totalHours);
        
        // Evaluate flags against system thresholds
        if (minutesOfDay < toMins(schedule.checkOutStart)) status = "EARLY_LEAVE";
        if (upsertData.totalHours * 60 < halfDayMins) status = "HALF_DAY";
        if (minutesOfDay > checkOutOnTime) isOvertime = true;
        
        upsertData.status = status;
        upsertData.isOvertime = isOvertime;
      }
    }

    // Save transactional metrics payload
    await prisma.workRecord.upsert({
      where: { employeeId_date: { employeeId, date: dateUTC } },
      create: upsertData,
      update: upsertData,
    });

    // Notify Connected Dashboard Terminals
    try {
  io?.emit("deviceStatus", { employeeId, date: dateUTC, status: upsertData.status ?? status });
  } catch (err) {
    console.error("[PunchService] WebSocket pipeline emission failure:", err);
  }

    return { success: true };
  }
}

export const punchService = new PunchService();