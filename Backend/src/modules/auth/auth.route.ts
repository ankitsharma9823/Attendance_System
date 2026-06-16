import { Router } from "express";
import {
  Login,
  VerifyEmail,
  ResendVerification,
  ForgotPassword,
  ResetPassword,
  AdminRegisterUser,
  getUser,
  updateUser,
  deleteUser,
} from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authLimiter } from "../../middleware/rate-limit.middleware";

const router = Router();

router.post("/verify-email", authLimiter, VerifyEmail);
router.post("/resend-verification", authLimiter, ResendVerification);
router.post("/login", authLimiter, Login);
router.post("/forgot-password", authLimiter, ForgotPassword);
router.post("/reset-password", authLimiter, ResetPassword);

router.post("/admin/register", authenticate, AdminRegisterUser);
router.get("/user", authenticate, getUser);
router.put("/user/:id", authenticate, updateUser);
router.delete("/user/:id", authenticate, deleteUser);

export default router;