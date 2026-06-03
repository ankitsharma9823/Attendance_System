import { Router } from "express";
import {
  Login,
  VerifyEmail,
  ResendVerification,
  ForgotPassword,
  ResetPassword,
  AdminRegisterUser,
} from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.post("/verify-email", VerifyEmail);
router.post("/resend-verification", ResendVerification);
router.post("/login", Login);
router.post("/forgot-password", ForgotPassword);
router.post("/reset-password", ResetPassword);
router.post("/admin/register", AdminRegisterUser);

export default router;
