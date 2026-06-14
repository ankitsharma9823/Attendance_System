import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../utils/jjwt";
import prisma from "../config/db";

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

// Simple in-memory cache: employeeId -> { isActive, cachedAt }
const employeeStatusCache = new Map<string, { isActive: boolean; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

const getEmployeeStatus = async (employeeId: string): Promise<{ isActive: boolean } | null> => {
  const cached = employeeStatusCache.get(employeeId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { isActive: cached.isActive };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, isActive: true },
  });

  if (employee) {
    employeeStatusCache.set(employeeId, { isActive: employee.isActive, cachedAt: Date.now() });
  }

  return employee;
};

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Skip DB check for admin role — trust the JWT
    if (decoded.role === "admin") {
      req.user = decoded;
      return next();
    }

    const employeeId = String(decoded.employeeId);
    if (!employeeId || employeeId === "null") {
      req.user = decoded;
      return next();
    }

    const employee = await getEmployeeStatus(employeeId);

    if (!employee) {
      return res.status(401).json({ msg: "User no longer exists" });
    }

    if (!employee.isActive) {
      employeeStatusCache.delete(employeeId); // clear cache on deactivation
      return res.status(403).json({ msg: "Account deactivated. Access denied." });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};