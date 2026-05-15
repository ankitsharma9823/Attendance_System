// import { Request, Response } from "express";
// import prisma from "../../config/db";

// const parseDateOnly = (value: string) => {
//   const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
//   if (!match) return null;

//   const [, year, month, day] = match;
//   const parsed = new Date(Number(year), Number(month) - 1, Number(day));

//   if (
//     parsed.getFullYear() !== Number(year) ||
//     parsed.getMonth() !== Number(month) - 1 ||
//     parsed.getDate() !== Number(day)
//   ) {
//     return null;
//   }

//   return parsed;
// };

// // ── Yearly attendance records ─────────────────────────────────────────────────

// export const getAttendanceByYear = async (req: Request, res: Response) => {
//   try {
//     const { year, employeeId } = req.query;
//     const targetYear = year ? parseInt(String(year)) : new Date().getFullYear();

//     if (isNaN(targetYear)) {
//       res.status(400).json({ success: false, message: "Invalid year parameter." });
//       return;
//     }

//     const startOfYear     = new Date(`${targetYear}-01-01T00:00:00.000Z`);
//     const startOfNextYear = new Date(`${targetYear + 1}-01-01T00:00:00.000Z`);

//     const records = await prisma.workRecord.findMany({
//       where: {
//         date: { gte: startOfYear, lt: startOfNextYear },
//         ...(employeeId && { employeeId: String(employeeId) }),
//       },
//       include: { employee: { select: { name: true, department: true } } },
//       orderBy: { date: "desc" },
//     });

//     res.json({ success: true, count: records.length, data: records });
//   } catch (error: any) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // ── Yearly stats (monthly breakdown) ─────────────────────────────────────────

// export const getYearlyStats = async (req: Request, res: Response) => {
//   try {
//     const { year } = req.query;
//     const targetYear = year ? parseInt(String(year)) : new Date().getFullYear();

//     if (isNaN(targetYear)) {
//       res.status(400).json({ success: false, message: "Invalid year parameter." });
//       return;
//     }

//     const startOfYear     = new Date(`${targetYear}-01-01T00:00:00.000Z`);
//     const startOfNextYear = new Date(`${targetYear + 1}-01-01T00:00:00.000Z`);

//     const stats = await prisma.workRecord.findMany({
//       where:  { date: { gte: startOfYear, lt: startOfNextYear } },
//       select: { date: true, status: true },
//     });

//     const monthlyData = Array.from({ length: 12 }, (_, i) => ({
//       month:      new Date(targetYear, i, 1).toLocaleString("default", { month: "short" }),
//       present:    0,
//       late:       0,
//       absent:     0,
//       half_day:   0,
//       early_leave: 0,
//     }));

//     stats.forEach(({ date, status }) => {
//       const idx = new Date(date).getMonth();
//       switch (status) {
//         case "PRESENT":     monthlyData[idx].present++;     break;
//         case "LATE":        monthlyData[idx].late++;        break;
//         case "ABSENT":      monthlyData[idx].absent++;      break;
//         case "HALF_DAY":    monthlyData[idx].half_day++;    break;
//         case "EARLY_LEAVE": monthlyData[idx].early_leave++; break;
//       }
//     });

//     res.json({ success: true, year: targetYear, data: monthlyData });
//   } catch (error: any) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // ── Daily attendance records ──────────────────────────────────────────────────

// export const getAttendanceByDay = async (req: Request, res: Response) => {
//   try {
//     const { date, employeeId } = req.query;

//     if (!date) {
//       res.status(400).json({ success: false, message: "date is required." });
//       return;
//     }

//     const parsedDate = parseDateOnly(String(date));

//     if (!parsedDate) {
//       res.status(400).json({ success: false, message: "Invalid date format." });
//       return;
//     }

//     const dayStart = new Date(parsedDate);
//     dayStart.setHours(0, 0, 0, 0);

//     const dayEnd = new Date(parsedDate);
//     dayEnd.setHours(23, 59, 59, 999);

//     const records = await prisma.workRecord.findMany({
//       where: {
//         date: { gte: dayStart, lte: dayEnd },
//         ...(employeeId && { employeeId: String(employeeId) }),
//       },
//       include: { employee: { select: { name: true, department: true } } },
//       orderBy: { checkIn: "asc" },
//     });

//     res.json({ success: true, count: records.length, data: records });
//   } catch (error: any) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // ── Delete a work record ──────────────────────────────────────────────────────

// export const deleteRecord = async (req: Request, res: Response) => {
//   try {
//     const id = parseInt(req.params.id as string);

//     if (isNaN(id)) {
//       res.status(400).json({ success: false, message: "Invalid record ID." });
//       return;
//     }

//     await prisma.workRecord.delete({ where: { id } });
//     res.json({ success: true, message: "Record deleted successfully." });
//   } catch (error: any) {
//     if (error.code === "P2025") {
//       res.status(404).json({ success: false, message: "Record not found." });
//       return;
//     }
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

import { Request, Response } from "express";
import prisma from "../../config/db";

// FIX: Parse as local midnight, not UTC midnight
const parseDateOnly = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) return null;

  return parsed;
};

export const getAttendanceByYear = async (req: Request, res: Response) => {
  try {
    const { year, employeeId } = req.query;
    const targetYear = year ? parseInt(String(year)) : new Date().getFullYear();

    if (isNaN(targetYear)) {
      res.status(400).json({ success: false, message: "Invalid year parameter." });
      return;
    }

    // FIX: Local time boundaries instead of UTC strings
    const startOfYear     = new Date(targetYear,     0, 1);
    const startOfNextYear = new Date(targetYear + 1, 0, 1);

    const records = await prisma.workRecord.findMany({
      where: {
        date: { gte: startOfYear, lt: startOfNextYear },
        ...(employeeId && { employeeId: String(employeeId) }),
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
    const { year, employeeId } = req.query;
    const targetYear = year ? parseInt(String(year)) : new Date().getFullYear();

    if (isNaN(targetYear)) {
      res.status(400).json({ success: false, message: "Invalid year parameter." });
      return;
    }

    const startOfYear     = new Date(targetYear,     0, 1);
    const startOfNextYear = new Date(targetYear + 1, 0, 1);

    const stats = await prisma.workRecord.findMany({
      where: {
        date: { gte: startOfYear, lt: startOfNextYear },
        ...(employeeId && { employeeId: String(employeeId) }),
      },
      select: { date: true, status: true },
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month:       new Date(targetYear, i, 1).toLocaleString("default", { month: "short" }),
      present:     0,
      late:        0,
      absent:      0,
      half_day:    0,
      early_leave: 0,
    }));

    stats.forEach(({ date, status }) => {
      const idx = new Date(date).getMonth();
      switch (status) {
        case "PRESENT":     monthlyData[idx].present++;     break;
        case "LATE":        monthlyData[idx].late++;        break;
        case "ABSENT":      monthlyData[idx].absent++;      break;
        case "HALF_DAY":    monthlyData[idx].half_day++;    break;
        case "EARLY_LEAVE": monthlyData[idx].early_leave++; break;
      }
    });

    res.json({ success: true, year: targetYear, data: monthlyData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAttendanceByDay = async (req: Request, res: Response) => {
  try {
    const { date, employeeId } = req.query;

    if (!date) {
      res.status(400).json({ success: false, message: "date is required (YYYY-MM-DD)." });
      return;
    }

    const parsedDate = parseDateOnly(String(date));
    if (!parsedDate) {
      res.status(400).json({ success: false, message: "Invalid date format. Use YYYY-MM-DD." });
      return;
    }

    const dayStart = new Date(parsedDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(parsedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const records = await prisma.workRecord.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        ...(employeeId && { employeeId: String(employeeId) }),
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
    const id = parseInt(req.params.id as string);

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