import { Router } from "express";
import { handleAttendance } from "./machine.engine";
import { getAttendanceByYear, getYearlyStats, getAttendanceByDay, deleteRecord, } from "./attendance.controller";
import { authenticate } from "../../middleware/auth.middleware";
const router = Router();
router.use(authenticate);
router.get("/yearly", getAttendanceByYear);
router.get("/stats/yearly", getYearlyStats);
router.get("/daily", getAttendanceByDay);
router.delete("/:id", deleteRecord);
router.post("/test-logic", async (req, res) => {
    const { time, empId } = req.body;
    try {
        const result = await handleAttendance({
            employeeId: empId || "1",
            timestamp: time,
        });
        res.json({ message: "Test Successful", result });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
