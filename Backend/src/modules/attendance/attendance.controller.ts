import { Request, Response } from "express";
import prisma from "../../config/db";

export const getAllAttendance = async (req: Request, res: Response) => {
  try {
    const { employeeId, start, end } = req.query as any;
    const dateFilter = start && end ? { gte: new Date(start), lte: new Date(end) } : undefined;
    const where: any = {};
    if (employeeId) where.employeeId = String(employeeId);
    if (dateFilter) where.date = dateFilter;

    const records = await prisma.workRecord.findMany({
      where,
      include: { employee: true },
      orderBy: { date: "desc" },
    });
    res.json({ success: true, data: records });
  } catch (e: any) {
    console.error("[Attendance] getAllAttendance error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getUserPunches = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: "employeeId param required" });
    }
    const { start, end } = req.query as any;
    const dateFilter = start && end ? { gte: new Date(start), lte: new Date(end) } : undefined;
    const records = await prisma.workRecord.findMany({
      where: {
        employeeId: String(employeeId),
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      include: { employee: true },
      orderBy: { date: "desc" },
    });
    res.json({ success: true, data: records });
  } catch (e: any) {
    console.error("[Attendance] getUserPunches error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};
export const getAttendanceByYear = async (req: Request, res: Response) => {
  try {
    const year = parseInt(String(req.query.year || ""), 10);
    if (isNaN(year)) {
      return res.status(400).json({ success: false, message: "Valid year query param required" });
    }
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const records = await prisma.workRecord.findMany({
      where: { date: { gte: start, lt: end } },
      include: { employee: true },
      orderBy: { date: "desc" },
    });
    res.json({ success: true, data: records });
  } catch (e: any) {
    console.error("[Attendance] getAttendanceByYear error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getYearlyStats = async (req: Request, res: Response) => {
  try {
    const year = parseInt(String(req.query.year || ""), 10);
    if (isNaN(year)) {
      return res.status(400).json({ success: false, message: "Valid year query param required" });
    }
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const total = await prisma.workRecord.count({ where: { date: { gte: start, lt: end } } });
    const distinctEmployees = await prisma.workRecord.findMany({
      where: { date: { gte: start, lt: end } },
      select: { employeeId: true },
      distinct: ["employeeId"],
    });
    res.json({ success: true, totalRecords: total, distinctEmployees: distinctEmployees.length });
  } catch (e: any) {
    console.error("[Attendance] getYearlyStats error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getAttendanceByDay = async (req: Request, res: Response) => {
  try {
    const dateStr = String(req.query.date || "");
    const day = new Date(dateStr);
    if (isNaN(day.getTime())) {
      return res.status(400).json({ success: false, message: "Valid date query param required" });
    }
    const start = new Date(day.setHours(0, 0, 0, 0));
    const end = new Date(day.setHours(24, 0, 0, 0));
    const records = await prisma.workRecord.findMany({
      where: { date: { gte: start, lt: end } },
      include: { employee: true },
      orderBy: { date: "desc" },
    });
    res.json({ success: true, data: records });
  } catch (e: any) {
    console.error("[Attendance] getAttendanceByDay error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

export const deleteRecord = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Valid record id required" });
    }
    await prisma.workRecord.delete({ where: { id } });
    res.json({ success: true, message: "Record deleted" });
  } catch (e: any) {
    console.error("[Attendance] deleteRecord error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

export const updateAttendanceStatus = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { status } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Valid record id required" });
    }

    const validStatuses = ["PRESENT", "LATE", "ABSENT", "HALF_DAY", "EARLY_LEAVE"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value provided" });
    }

    const updatedRecord = await prisma.workRecord.update({
      where: { id },
      data: { status },
      include: { employee: true }
    });

    res.json({ success: true, message: "Status updated successfully", data: updatedRecord });
  } catch (e: any) {
    console.error("[Attendance] updateAttendanceStatus error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};