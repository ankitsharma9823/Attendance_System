import { Router } from "express";
import {
  syncTime,
  fetchTime,
  fetchInfo,
  fetchUsers,
  removeUser,
  purgeLogs,
  reboot,
  disable,
  enable,
} from "./device.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.post  ("/sync-time",   syncTime);
router.get   ("/time",        fetchTime);
router.get   ("/info",        fetchInfo);
router.get   ("/users",       fetchUsers);
router.delete("/users/:uid",  removeUser);
router.delete("/logs",        purgeLogs);
router.post  ("/reboot",      reboot);
router.post  ("/disable",     disable);
router.post  ("/enable",      enable);

export default router;