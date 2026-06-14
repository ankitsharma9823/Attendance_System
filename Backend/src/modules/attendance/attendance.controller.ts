import { Request, Response } from "express";
import prisma from "../../config/db";

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
export const updateAttendanceStatus = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { status, employeeId, date } = req.body;

    const validStatuses = ["PRESENT", "LATE", "ABSENT", "HALF_DAY", "EARLY_LEAVE", "LEAVE"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value provided" });
    }

    let updatedRecord;

    if (isNaN(id) || id === 0) {
      // No record yet — create it
      if (!employeeId || !date) {
        return res.status(400).json({ success: false, message: "employeeId and date required for new record" });
      }

      // date is already Nepal midnight UTC — use directly
      const startOfDay = new Date(date);

      updatedRecord = await prisma.workRecord.upsert({
        where: { employeeId_date: { employeeId, date: startOfDay } },
        create: { employeeId, date: startOfDay, status, totalHours: 0, overtime: 0 },
        update: { status },
        include: { employee: true },
      });
    } else {
      // Existing record — just update status
      updatedRecord = await prisma.workRecord.update({
        where: { id },
        data: { status },
        include: { employee: true },
      });
    }

    res.json({ success: true, message: "Status updated successfully", data: updatedRecord });
  } catch (e: any) {
    console.error("[Attendance] updateAttendanceStatus error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getDailyAttendanceWithAbsent = async (req: Request, res: Response) => {
  try {
    const dateStr = String(req.query.date || "");
    const day = new Date(dateStr);
    if (isNaN(day.getTime())) {
      return res.status(400).json({ success: false, message: "Valid date required" });
    }

    const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
    const startOfDay = new Date(
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0) - NEPAL_OFFSET_MS
    );

    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      }
    });

    const records = await prisma.workRecord.findMany({
      where: { date: startOfDay },
      include: { employee: true },
    });

    const recordMap = new Map(records.map(r => [r.employeeId, r]));

    const result = employees.map(emp => {
      const record = recordMap.get(emp.id);
      if (record) {
        return record; 
      }
      return {
        id: null,
        employeeId: emp.id,
        date: startOfDay,
        checkIn: null,
        checkOut: null,
        breakOut: null,
        breakIn: null,
        totalHours: 0,
        overtime: 0,
        status: "ABSENT",
        employee: {
          name: emp.name,
        }
      };
    });

    res.json({ success: true, date: startOfDay, data: result });
  } catch (e: any) {
    console.error("[Attendance] getDailyAttendanceWithAbsent error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};