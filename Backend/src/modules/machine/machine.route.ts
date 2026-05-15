import { Router } from "express";
import { Request, Response } from "express";
import { syncWithMachine, syncEmployeesFromDevice } from "./machine.engine";
import { authenticate } from "../../middleware/auth.middleware";
import { setLastSyncTime } from "../../config/device.config";
import prisma from "../../config/db";

const router = Router();

router.use(authenticate);

router.post("/sync", async (_req: Request, res: Response) => {
  try {
    const result = await syncWithMachine();
    res.status(result.success ? 200 : 503).json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/sync-employees", async (_req: Request, res: Response) => {
  try {
    const result = await syncEmployeesFromDevice();
    res.status(result.success ? 200 : 503).json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/reset-cursor", (_req: Request, res: Response) => {
  setLastSyncTime(null);
  res.json({ success: true, message: "Cursor reset. Next sync will re-import all logs." });
});

router.post("/cleanup", async (_req: Request, res: Response) => {
  try {
    // Step 1: Delete all records before 2026
    const oldRecords = await prisma.workRecord.deleteMany({
      where: { date: { lt: new Date("2026-01-01") } },
    });

    // Step 2: Delete ALL 2026 records
    const currentRecords = await prisma.workRecord.deleteMany({
      where: { date: { gte: new Date("2026-01-01") } },
    });

    // FIX: You MUST reset both state variables to force a complete hardware re-import
    setLastSyncTime(null);
    setLastSyncSn(0); 

    res.json({
      success: true,
      message: "Full cleanup complete. All hardware cursors reset successfully.",
      deleted: {
        oldRecords: oldRecords.count,
        currentRecords: currentRecords.count,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// FIX: Cast empId to string to satisfy Prisma's StringFilter type
router.get("/debug-emp/:empId", async (req: Request, res: Response) => {
  try {
    const empId = String(req.params.empId);
    const records = await prisma.workRecord.findMany({
      where: { employeeId: empId },
      orderBy: { date: "desc" },
      take: 10,
    });
    res.json({ success: true, count: records.length, data: records });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;