import { Router } from "express";
import {
  getAttendanceByYear,
  getYearlyStats,
  updateAttendanceStatus,
  getDailyAttendanceWithAbsent
} from "./attendance.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/yearly", getAttendanceByYear);
router.get("/stats/yearly", getYearlyStats);
router.patch("/:id/status", updateAttendanceStatus);
router.get("/daily-full", getDailyAttendanceWithAbsent);

export default router;
