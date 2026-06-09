import prisma from "../../config/db";
import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
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
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../utils/email.service";
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
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ msg: "User already exists" });
    }

    // Check if username matches an employee ID
    const employee = await prisma.employee.findFirst({
      where: {
        name: {
          equals: username.trim(),
          mode: "insensitive", // Makes "John Doe" match "john doe"
        },
      },
    });

    // Warn but don't block — admin accounts won't have an employee
    if (!employee && role !== "admin") {
      return res.status(400).json({
        msg: `No employee found with ID "${username}". Username must match an employee ID from the device.`,
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: role === "admin" ? "admin" : "user",
        employeeId: employee?.id ?? null, // auto-link if employee exists
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
      },
    });

    return res.status(201).json({
      msg: "User registered successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      },
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
      res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
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
      res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
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

    return res
      .status(200)
      .json({ msg: "Verification code resent", email: user.email });
  } catch (error) {
    console.error("ResendVerification error:", error);
    res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const Login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
      return;
    }
      
    const user = await findUserByEmail(email);
    console.log("User found:", user ? user.email : "NULL");
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
    console.log("Password match result:", passwordMatch);
    if (!passwordMatch) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      employeeId: user.employeeId ?? null,
    });

    return res.status(200).json({
      msg: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId ?? null,
      },
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
      res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
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

export const getUser = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const users = await prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, username: true, email: true, role: true },
    });
    const total = await prisma.user.count();
    res.json({ users, meta: { page, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ msg: "Error" });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const authenticatedUserId = req.user?.id;
    const { username, role } = req.body;

    if (!authenticatedUserId) {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    const dataToUpdate: any = { username };

    if (req.user?.role === "admin" && role) {
      dataToUpdate.role = role;
    }

    const updatedUser = await prisma.user.update({
      where: { id: authenticatedUserId },
      data: dataToUpdate,
    });

    res.status(200).json({ msg: "Profile updated", user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error" });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));

    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid User ID is required" });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await prisma.user.delete({ where: { id } });

    return res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("deleteUser error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};
