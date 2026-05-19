import { Router } from "express";
import {
  getAttendanceByYear,
  getYearlyStats,
  getAttendanceByDay,
  deleteRecord,
} from "./attendance.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/yearly", getAttendanceByYear);
router.get("/stats/yearly", getYearlyStats);
router.get("/daily", getAttendanceByDay);
router.delete("/:id", deleteRecord);

export default router;
