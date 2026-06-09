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

const router = Router();

router.post("/verify-email", VerifyEmail);
router.post("/resend-verification", ResendVerification);
router.post("/login", Login);
router.post("/forgot-password", ForgotPassword);
router.post("/reset-password", ResetPassword);
router.post("/admin/register", authenticate,AdminRegisterUser);
router.get("/user", getUser)
router.put("/user", authenticate, updateUser);
router.delete('/user/:id', deleteUser);
export default router;
