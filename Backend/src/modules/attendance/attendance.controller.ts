import { Request, Response } from "express";
import prisma from "../../config/db";

const parseDateOnly = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return null;
  }
  return parsed;
};

export const getAttendanceByYear = async (req: Request, res: Response) => {
  try {
    const { year, employeeId, status } = req.query;
    const targetYear = year ? parseInt(String(year)) : new Date().getFullYear();
    if (isNaN(targetYear)) {
      res.status(400).json({ success: false, message: "Invalid year parameter." });
      return;
    }

    const startOfYear = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const startOfNextYear = new Date(`${targetYear + 1}-01-01T00:00:00.000Z`);

    const records = await prisma.workRecord.findMany({
      where: {
        date: { gte: startOfYear, lt: startOfNextYear },
        ...(employeeId && { employeeId: String(employeeId) }),
        ...(status && { status: String(status) as any }),
      },
      include: { employee: { select: { name: true, department: true } } },
      orderBy: { date: "desc" },
    });

    res.json({ success: true, count: records.length, data: records });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getYearlyStats = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(String(year)) : new Date().getFullYear();
    if (isNaN(targetYear)) {
      res.status(400).json({ success: false, message: "Invalid year parameter." });
      return;
    }

    const startOfYear = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const startOfNextYear = new Date(`${targetYear + 1}-01-01T00:00:00.000Z`);

    const stats = await prisma.workRecord.findMany({
      where: { date: { gte: startOfYear, lt: startOfNextYear } },
      select: { date: true, status: true },
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(targetYear, i, 1).toLocaleString("default", { month: "short" }),
      present: 0,
      late: 0,
      absent: 0,
      half_day: 0,
      early_leave: 0,
    }));

    stats.forEach(({ date, status }) => {
      const idx = new Date(date).getMonth();
      switch (status) {
        case "PRESENT":
          monthlyData[idx].present++;
          break;
        case "LATE":
          monthlyData[idx].late++;
          break;
        case "ABSENT":
          monthlyData[idx].absent++;
          break;
        case "HALF_DAY":
          monthlyData[idx].half_day++;
          break;
        case "EARLY_LEAVE":
          monthlyData[idx].early_leave++;
          break;
      }
    });

    res.json({ success: true, year: targetYear, data: monthlyData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAttendanceByDay = async (req: Request, res: Response) => {
  try {
    const { date, employeeId, status } = req.query;
    if (!date) {
      res.status(400).json({ success: false, message: "date is required." });
      return;
    }

    const parsedDate = parseDateOnly(String(date));
    if (!parsedDate) {
      res.status(400).json({ success: false, message: "Invalid date format." });
      return;
    }

    const y = parsedDate.getFullYear();
    const m = parsedDate.getMonth();
    const d = parsedDate.getDate();
    const dayStart = new Date(y, m, d, 0, 0, 0, 0);
    const dayEnd = new Date(y, m, d, 23, 59, 59, 999);

    const records = await prisma.workRecord.findMany({
      where: {
        OR: [
          { date: { gte: dayStart, lte: dayEnd } },
          { checkIn: { gte: dayStart, lte: dayEnd } },
        ],
        ...(employeeId && { employeeId: String(employeeId) }),
        ...(status && { status: String(status) as any }),
      },
      include: { employee: { select: { name: true, department: true } } },
      orderBy: { checkIn: "asc" },
    });

    res.json({ success: true, count: records.length, data: records });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRecord = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid record ID." });
      return;
    }

    await prisma.workRecord.delete({ where: { id } });
    res.json({ success: true, message: "Record deleted successfully." });
  } catch (error: any) {
    if (error.code === "P2025") {
      res.status(404).json({ success: false, message: "Record not found." });
      return;
    }
    res.status(500).json({ success: false, message: error.message });
  }
};
