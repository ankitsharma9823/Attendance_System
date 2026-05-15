import prisma from "../../config/db";
import { Request, Response } from "express";
import {
  generateOTP,
  generateResetToken,
  getOTPExpiry,
  getResetTokenExpiry,
  hashPassword,
  verifyPassword,
  isOTPExpired,
  isResetTokenExpired,
} from "./auth.service";
import { sendVerificationEmail, sendPasswordResetEmail } from "../../utils/email.service";
import { generateToken } from "../../utils/jjwt";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const findUserByEmail = (email: string) => {
  return prisma.user.findFirst({
    where: {
      email: {
        equals: normalizeEmail(email),
        mode: "insensitive",
      },
    },
  });
};

export const AdminRegisterUser = async (req: any, res: Response) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ msg: "Only admins can register users" });
    }

    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ success: false, message: "Missing required fields." });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ msg: "User already exists" });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: role === "admin" ? "admin" : "user",
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
      },
    });

    return res.status(201).json({
      msg: "User registered successfully",
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("AdminRegisterUser error:", error);
    res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const Register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ success: false, message: "Missing required fields." });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ msg: "User already exists" });
    }

    const otp = generateOTP();
    const hashedPassword = await hashPassword(password);
    const otpExpiry = getOTPExpiry();

    await prisma.user.create({
      data: {
        username: username.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "user",
        emailVerified: false,
        emailVerificationCode: otp,
        emailVerificationExpiry: otpExpiry,
      },
    });

    const emailSent = await sendVerificationEmail(normalizedEmail, otp);
    if (!emailSent) {
      return res.status(500).json({ msg: "Failed to send verification email" });
    }

    return res.status(201).json({
      msg: "Registration successful. Verification code sent to email.",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const VerifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ success: false, message: "Missing required fields." });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(200).json({ msg: "Email is already verified" });
    }

    if (isOTPExpired(user.emailVerificationExpiry)) {
      return res.status(400).json({ msg: "Verification code has expired" });
    }

    if (user.emailVerificationCode !== otp) {
      return res.status(400).json({ msg: "Invalid verification code" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
      },
    });

    return res.status(200).json({ msg: "Email verified successfully" });
  } catch (error) {
    console.error("VerifyEmail error:", error);
    res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const ResendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required." });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(200).json({ msg: "Email is already verified" });
    }

    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode: otp,
        emailVerificationExpiry: otpExpiry,
      },
    });

    const emailSent = await sendVerificationEmail(user.email, otp);
    if (!emailSent) {
      return res.status(500).json({ msg: "Failed to send verification email" });
    }

    return res.status(200).json({ msg: "Verification code resent", email: user.email });
  } catch (error) {
    console.error("ResendVerification error:", error);
    res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const Login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: "Missing required fields." });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        msg: "Please verify your email first",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });
    }

    const passwordMatch = await verifyPassword(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });

    return res.status(200).json({
      msg: "Login successful",
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const ForgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required." });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const resetToken = generateResetToken();
    const resetExpiry = getResetTokenExpiry();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      },
    });

    const emailSent = await sendPasswordResetEmail(user.email, resetToken);
    if (!emailSent) {
      return res.status(500).json({ msg: "Failed to send reset email" });
    }

    return res.status(200).json({
      msg: "Password reset link sent to email",
    });
  } catch (error) {
    console.error("ForgotPassword error:", error);
    res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const ResetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ success: false, message: "Missing required fields." });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { passwordResetToken: token },
    });

    if (!user) {
      return res.status(404).json({ msg: "Invalid reset token" });
    }

    if (isResetTokenExpired(user.passwordResetExpiry)) {
      return res.status(400).json({ msg: "Reset token has expired" });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return res.status(200).json({ msg: "Password reset successful" });
  } catch (error) {
    console.error("ResetPassword error:", error);
    res.status(500).json({ msg: "Internal Server Error", error });
  }
};
