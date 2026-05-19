import { Router } from "express";
import { getSchedule, updateSchedule } from "../../services/schedule.service";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const schedule = await getSchedule();
    res.json({ success: true, data: schedule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/", async (req, res) => {
  try {
    const updated = await updateSchedule(req.body);
    res.json({ success: true, data: updated, message: "Schedule updated successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
