import { Router } from "express";
import { syncWithMachine, syncEmployeesFromDevice } from "../machine/machine.engine";
import { authenticate } from "../../middleware/auth.middleware";
const router = Router();
router.use(authenticate);
// Manually trigger a full attendance sync from device
router.post("/sync", async (_req, res) => {
    try {
        const result = await syncWithMachine();
        res.status(result.success ? 200 : 503).json(result);
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// Manually sync employees from ZKTeco device into DB
router.post("/sync-employees", async (_req, res) => {
    try {
        const result = await syncEmployeesFromDevice();
        res.status(result.success ? 200 : 503).json(result);
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
export default router;
