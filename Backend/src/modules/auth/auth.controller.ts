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

export const AdminRegisterUser = async (req: AuthRequest, res: Response) => {
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

    const employee = await prisma.employee.findFirst({
      where: {
        name: {
          equals: username.trim(),
          mode: "insensitive",
        },
      },
    });

    if (!employee && role !== "admin") {
      return res.status(400).json({
        msg: `No employee found with name "${username}". Username must match an employee name from the device.`,
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: role === "admin" ? "admin" : "user",
        employeeId: employee?.id ?? null,
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
    return res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const Register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ msg: "Missing required fields" });
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
    return res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const VerifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ msg: "Missing required fields" });
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
    return res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const ResendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
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
    return res.status(500).json({ msg: "Internal Server Error", error });
  }
};
export const Login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    // 1. Fetch user AND include the related employee object
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizeEmail(email), mode: "insensitive" } },
      include: { employee: true } // Ensure you include the employee relation
    });

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

    // 2. Use user.employee.id if it exists, otherwise use user.id or handle as needed
    // Assuming you want to use the employee's ID if available
    const token = generateToken({
      id: user.employeeId ? user.employeeId : user.id.toString(), 
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
    return res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const ForgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
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

    return res.status(200).json({ msg: "Password reset link sent to email" });
  } catch (error) {
    console.error("ForgotPassword error:", error);
    return res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const ResetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ msg: "Missing required fields" });
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
    return res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          employeeId: true,
        },
      }),
      prisma.user.count(),
    ]);

    return res.json({ users, meta: { page, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("getUser error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ msg: "Admins only" });
    }

    const targetId = parseInt(req.params.id as string);
    if (isNaN(targetId)) {
      return res.status(400).json({ msg: "Invalid user ID" });
    }

    const existing = await prisma.user.findUnique({ where: { id: targetId } });
    if (!existing) {
      return res.status(404).json({ msg: "User not found" });
    }

    const { username, role, email, employeeId } = req.body;
    const dataToUpdate: Record<string, any> = {};

    if (username !== undefined)   dataToUpdate.username   = username.trim();
    if (role !== undefined)       dataToUpdate.role       = role;
    if (email !== undefined)      dataToUpdate.email      = normalizeEmail(email);
    if (employeeId !== undefined) dataToUpdate.employeeId = employeeId;

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ msg: "No fields provided to update" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetId },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        employeeId: true,
      },
    });

    return res.status(200).json({ msg: "User updated", user: updatedUser });
  } catch (error) {
    console.error("updateUser error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ msg: "Admins only" });
    }
    const targetId = parseInt(req.params.id as string);
    if (isNaN(targetId)) {
      return res.status(400).json({ msg: "Invalid user ID" });
    }
    const existing = await prisma.user.findUnique({ where: { id: targetId } });
    if (!existing) {
      return res.status(404).json({ msg: "User not found" });
    }
    await prisma.user.delete({ 
      where: { id: targetId } 
    });

    return res.status(200).json({ msg: "User permanently removed from the system" });
  } catch (error) {
    console.error("deleteUser error:", error);
    return res.status(500).json({ 
        msg: "Failed to delete user. The user may be linked to existing attendance records." 
    });
  }
};