import { handleAttendance } from "../modules/attendance/machine.engine";
async function test() {
    const myId = "164069";
    const today = "2026-05-13"; // Use today's date
    console.log("🟡 Step 1: Simulating Check-in at 9:00 AM...");
    await handleAttendance({
        employeeId: myId,
        timestamp: `${today}T09:00:00`,
    });
    console.log("🟡 Step 2: Simulating Check-out at 6:00 PM...");
    await handleAttendance({
        employeeId: myId,
        timestamp: `${today}T18:00:00`,
    });
    console.log("✅ Done! Go check your Dashboard.");
}
test();
