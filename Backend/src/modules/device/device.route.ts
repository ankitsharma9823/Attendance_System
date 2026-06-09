import { Router } from "express";
import { deviceController } from "./device.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { deviceOpsLimiter } from "../../middleware/rate-limit.middleware";

const router = Router();

router.use(authenticate);

// Machine operations — rate limited
router.post("/sync",           deviceOpsLimiter, (req, res) => deviceController.syncLogs(req, res));
router.post("/sync-time",      deviceOpsLimiter, (req, res) => deviceController.syncTime(req, res));
router.post("/reset-cursors",  deviceOpsLimiter, (req, res) => deviceController.resetCursors(req, res));
router.get( "/machine-time",   deviceOpsLimiter, (req, res) => deviceController.getMachineTime(req, res));
router.post("/cleanup",        deviceOpsLimiter, (req, res) => deviceController.purgeDatabase(req, res));

// User / biometric management
router.get(   "/users",              (req, res) => deviceController.getUsers(req, res));
router.post(  "/users",              (req, res) => deviceController.addUser(req, res));
router.patch( "/users/:id",          (req, res) => deviceController.updateUser(req, res));
router.delete("/users/:id",          (req, res) => deviceController.deleteUser(req, res));
router.post(  "/users/:id/clear-fp", (req, res) => deviceController.clearFingerprint(req, res));

export default router;