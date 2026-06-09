import { Router } from "express";
import {
  getAttendanceByYear,
  getYearlyStats,
  getAttendanceByDay,
  deleteRecord,
  updateAttendanceStatus,
} from "./attendance.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/yearly", getAttendanceByYear);
router.get("/stats/yearly", getYearlyStats);
router.get("/daily", getAttendanceByDay);
router.delete("/:id", deleteRecord);
router.patch("/:id/status", updateAttendanceStatus);

export default router;
