// import prisma from "../../config/db";
// export interface Log {
//   employeeId: string;
//   timestamp: string;
//   type?: "IN" | "OUT";      
//   deviceIp?: string;        
// }
// // ── Policy Constants ────────────────────────────────────────────────────────
// const HALF_DAY_HOUR    = 13; // 1 PM
// const BLOCK_CHECKIN_HR = 14; // 2 PM (Hard Block)
// const BREAK_START_HOUR = 13; // 1 PM (Start break window earlier to capture punches)
// const EARLY_LEAVE_HOUR = 16; // 4 PM
// const SHIFT_END_HOUR   = 17; // 5 PM
// const OT_START_MIN     = 10; // 5:10 PM
// export const handleAttendance = async (log: Log) => {
//   const { employeeId, timestamp } = log;
//   if (!timestamp) return;
//   const logTime = new Date(timestamp);
//   const hour = logTime.getHours();
//   // Date key: Midnight normalization
//   const logDate = new Date(logTime);
//   logDate.setHours(0, 0, 0, 0);
//   // 1. Verify Employee exists
//   const employee = await prisma.employee.findFirst({
//     where: { id: employeeId } 
//   });
//   if (!employee) {
//     console.error(`❌ Employee with ID ${employeeId} not found.`);
//     return;
//   }
//   // 2. Fetch current record
//   const record = await prisma.workRecord.findFirst({
//     where: { employeeId, date: logDate },
//   });
//   // 3. STOP if checkout already exists
//   if (record?.checkOut) return;
//   let updateData: any = {};
//   let finalStatus: string = record?.status ?? "PRESENT";
//   // --- STAGE 1: INITIAL CHECK-IN ---
//   if (!record) {
//     // 🛑 HARD BLOCK: No check-in after 2:00 PM if no record exists
//     if (hour >= BLOCK_CHECKIN_HR) {
//       console.log(`🚫 Check-in blocked for ${employeeId} at ${hour}:00`);
//       return; 
//     }
//     updateData.checkIn = logTime;
//     finalStatus = hour >= HALF_DAY_HOUR ? "HALF_DAY" : "PRESENT";
//     return await prisma.workRecord.create({
//       data: { 
//         employeeId, 
//         date: logDate, 
//         status: finalStatus, 
//         checkIn: logTime,
//         overtime: 0 
//       },
//     });
//   }
//   // --- STAGE 2: BREAK & CHECKOUT (Only if record exists) ---
//   // A. BREAK LOGIC: 1 PM – 5 PM
//   // We check this BEFORE checkout logic to ensure mid-day punches are breaks
//   if (hour >= BREAK_START_HOUR && hour < SHIFT_END_HOUR) {
//     if (!record.breakOut) {
//       updateData.breakOut = logTime;
//       console.log(`☕ Break Started (Out) for ${employeeId}`);
//     } else if (!record.breakIn) {
//       updateData.breakIn = logTime;
//       console.log(`🔙 Break Ended (In) for ${employeeId}`);
//     } else {
//       // If both breaks are already done, treat this as a checkout
//       updateData.checkOut = logTime;
//     }
//   } 
//   // B. CHECKOUT: 5 PM+
//   else if (hour >= SHIFT_END_HOUR) {
//     updateData.checkOut = logTime;
//     const otStart = new Date(logDate);
//     otStart.setHours(SHIFT_END_HOUR, OT_START_MIN, 0, 0);
//     if (logTime > otStart) {
//       updateData.overtime = Math.floor((logTime.getTime() - otStart.getTime()) / 60000);
//     }
//   } 
//   // C. EARLY LEAVE / NEUTRAL
//   else {
//     updateData.checkOut = logTime;
//     if (hour < EARLY_LEAVE_HOUR) {
//       finalStatus = "EARLY_LEAVE";
//     }
//   }
//   // Final Update (Using the specific DB ID from the record we found)
//   return await prisma.workRecord.update({
//     where: { id: record.id },
//     data: { ...updateData, status: finalStatus },
//   });
// };
import prisma from "../../config/db";
// ── Policy Constants ──────────────────────────────────────────────────────────
const HALF_DAY_HOUR = 13; // 1 PM  — check-in after this = HALF_DAY
const BLOCK_CHECKIN_HR = 14; // 2 PM  — hard block on new check-ins
const BREAK_START_HOUR = 13; // 1 PM  — break window opens
const EARLY_LEAVE_HOUR = 16; // 4 PM  — checkout before this = EARLY_LEAVE
const SHIFT_END_HOUR = 17; // 5 PM  — normal checkout / OT starts
const OT_START_MIN = 10; // 5:10 PM — OT counted after this
// ── Main Handler ──────────────────────────────────────────────────────────────
export const handleAttendance = async (log) => {
    const { employeeId, timestamp } = log;
    if (!timestamp || !employeeId)
        return;
    const logTime = new Date(timestamp);
    if (isNaN(logTime.getTime())) {
        console.error(`❌ Invalid timestamp for employee ${employeeId}: ${timestamp}`);
        return;
    }
    const hour = logTime.getHours();
    // Midnight-normalised date key
    const logDate = new Date(logTime);
    logDate.setHours(0, 0, 0, 0);
    // ── 1. Find or auto-create employee ────────────────────────────────────────
    let employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
        console.warn(`⚠️  Employee ${employeeId} not in DB — auto-creating with placeholder name.`);
        try {
            employee = await prisma.employee.create({
                data: {
                    id: employeeId,
                    name: `Employee ${employeeId}`,
                    department: null,
                },
            });
        }
        catch (createErr) {
            // Handle race condition: another process may have created it simultaneously
            employee = await prisma.employee.findUnique({ where: { id: employeeId } });
            if (!employee) {
                console.error(`❌ Could not create employee ${employeeId}:`, createErr?.message);
                return;
            }
        }
    }
    // ── 2. Fetch today's record ─────────────────────────────────────────────────
    const record = await prisma.workRecord.findUnique({
        where: { employeeId_date: { employeeId, date: logDate } },
    });
    // ── 3. Stop if already checked out ─────────────────────────────────────────
    if (record?.checkOut)
        return;
    let updateData = {};
    let finalStatus = record?.status ?? "PRESENT";
    // ── STAGE 1: Initial check-in (no record yet) ───────────────────────────────
    if (!record) {
        // Hard block: no check-in after 2 PM
        if (hour >= BLOCK_CHECKIN_HR) {
            console.log(`🚫 Check-in blocked for ${employeeId} at ${hour}:00`);
            return;
        }
        const status = hour >= HALF_DAY_HOUR ? "HALF_DAY" : "PRESENT";
        await prisma.workRecord.create({
            data: {
                employeeId,
                date: logDate,
                status,
                checkIn: logTime,
                overtime: 0,
            },
        });
        console.log(`✅ Check-in recorded for ${employeeId} at ${logTime.toLocaleTimeString()} — ${status}`);
        return;
    }
    // ── STAGE 2: Break or checkout (record already exists) ─────────────────────
    // A. Break window: 1 PM – 5 PM
    if (hour >= BREAK_START_HOUR && hour < SHIFT_END_HOUR) {
        if (!record.breakOut) {
            updateData.breakOut = logTime;
            console.log(`☕ Break started for ${employeeId}`);
        }
        else if (!record.breakIn) {
            updateData.breakIn = logTime;
            console.log(`🔙 Break ended for ${employeeId}`);
        }
        else {
            // Both break slots filled — treat as early checkout
            updateData.checkOut = logTime;
            if (hour < EARLY_LEAVE_HOUR) {
                finalStatus = "EARLY_LEAVE";
            }
            console.log(`🚪 Checkout (post-break) for ${employeeId} — ${finalStatus}`);
        }
    }
    // B. Normal / overtime checkout: 5 PM+
    else if (hour >= SHIFT_END_HOUR) {
        updateData.checkOut = logTime;
        const otStart = new Date(logDate);
        otStart.setHours(SHIFT_END_HOUR, OT_START_MIN, 0, 0);
        if (logTime > otStart) {
            updateData.overtime = Math.floor((logTime.getTime() - otStart.getTime()) / 60000);
            console.log(`⏱️  OT ${updateData.overtime} min for ${employeeId}`);
        }
        console.log(`🚪 Checkout for ${employeeId} at ${logTime.toLocaleTimeString()}`);
    }
    // C. Early leave: before 1 PM and not the first punch
    else {
        updateData.checkOut = logTime;
        finalStatus = "EARLY_LEAVE";
        console.log(`⚠️  Early leave for ${employeeId} at ${logTime.toLocaleTimeString()}`);
    }
    // ── Final update ────────────────────────────────────────────────────────────
    if (Object.keys(updateData).length > 0) {
        await prisma.workRecord.update({
            where: { id: record.id },
            data: { ...updateData, status: finalStatus },
        });
    }
};
