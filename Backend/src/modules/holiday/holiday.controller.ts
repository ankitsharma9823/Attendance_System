// import { Response } from 'express';
// import prisma from '../../config/db';
// import { AuthRequest } from '../../middleware/auth.middleware';
// const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60
// const toNepalStartOfDay = (dateInput: Date): Date => {
//   return new Date(
//     Date.UTC(
//       dateInput.getUTCFullYear(),
//       dateInput.getUTCMonth(),
//       dateInput.getUTCDate(),
//       0, 0, 0,
//     ) - NEPAL_OFFSET_MS,
//   );
// };
// const getWorkingDays = (start: Date, end: Date): Date[] => {
//   const days: Date[] = [];
//   const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
//   const last    = new Date(Date.UTC(end.getUTCFullYear(),   end.getUTCMonth(),   end.getUTCDate()));

//   while (current <= last) {
//     const day = current.getUTCDay(); // 0=Sun, 6=Sat
//     if (day !== 0 && day !== 6) {
//       days.push(toNepalStartOfDay(current)); // store as Nepal midnight UTC
//     }
//     current.setUTCDate(current.getUTCDate() + 1);
//   }
//   return days;
// };

// const markLeaveDays = async (employeeId: string, startDate: Date, endDate: Date) => {
//   const days = getWorkingDays(startDate, endDate);
//   for (const date of days) {
//     await prisma.workRecord.upsert({
//       where: { employeeId_date: { employeeId, date } },
//       create: {
//         employeeId,
//         date,
//         status: 'LEAVE',
//         totalHours: 0,
//       },
//       update: {
//         status: 'LEAVE',
//       },
//     });
//   }
// };

// const removeLeaveDays = async (employeeId: string, startDate: Date, endDate: Date) => {
//   const days = getWorkingDays(startDate, endDate);
//   await prisma.workRecord.deleteMany({
//     where: {
//       employeeId,
//       date: { in: days },
//       status: 'LEAVE',
//     }
//   });
// };

// export const createRequest = async (req: AuthRequest, res: Response) => {
//   try {
//     const employeeId = req.user?.employeeId;
//     const { startDate, endDate, reason } = req.body;

//     if (!employeeId || !startDate || !endDate) {
//       return res.status(400).json({ msg: "Missing required fields" });
//     }

//     const request = await prisma.holiday.create({
//       data: {
//         employeeId,
//         startDate: new Date(startDate),
//         endDate: new Date(endDate),
//         reason,
//       }
//     });

//     res.status(201).json(request);
//   } catch (error) {
//     res.status(500).json({ msg: "Internal Server Error" });
//   }
// };

// export const getMyRequests = async (req: AuthRequest, res: Response) => {
//   try {
//     const employeeId = req.user?.employeeId;
//     if (!employeeId) return res.status(403).json({ msg: "No employee profile linked" });

//     const requests = await prisma.holiday.findMany({
//       where: { employeeId },
//       orderBy: { createdAt: 'desc' }
//     });

//     res.json(requests);
//   } catch (error) {
//     res.status(500).json({ msg: "Internal Server Error" });
//   }
// };

// export const getAllRequests = async (req: AuthRequest, res: Response) => {
//   try {
//     if (req.user?.role !== 'admin') {
//       return res.status(403).json({ msg: "Admins only" });
//     }

//     const requests = await prisma.holiday.findMany({
//       orderBy: { createdAt: 'desc' },
//       include: {
//         employee: { select: { name: true, department: true } }
//       }
//     });

//     res.json(requests);
//   } catch (error) {
//     res.status(500).json({ msg: "Internal Server Error" });
//   }
// };

// export const updateStatus = async (req: AuthRequest, res: Response) => {
//   try {
//     if (req.user?.role !== 'admin') {
//       return res.status(403).json({ msg: "Admins only" });
//     }

//     const { id } = req.params;
//     const { status, adminNote } = req.body;

//     if (!status) return res.status(400).json({ msg: "Status is required" });

//     const updated = await prisma.holiday.update({
//       where: { id: Number(id) },
//       data: { status, adminNote },
//       include: {
//         employee: { select: { name: true, department: true } }
//       }
//     });

//     if (status === 'APPROVED') {
//       await markLeaveDays(updated.employeeId, updated.startDate, updated.endDate);
//     }

//     if (status === 'REJECTED' || status === 'PENDING') {
//       await removeLeaveDays(updated.employeeId, updated.startDate, updated.endDate);
//     }

//     res.json(updated);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ msg: "Internal Server Error" });
//   }
// };
import { Response } from 'express';
import prisma from '../../config/db';
import { AuthRequest } from '../../middleware/auth.middleware';

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

const toNepalStartOfDay = (dateInput: Date): Date => {
  return new Date(
    Date.UTC(
      dateInput.getUTCFullYear(),
      dateInput.getUTCMonth(),
      dateInput.getUTCDate(),
      0, 0, 0,
    ) - NEPAL_OFFSET_MS,
  );
};

const getWorkingDays = (start: Date, end: Date): Date[] => {
  const days: Date[] = [];
  const current = new Date(Date.UTC(
    start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()
  ));
  const last = new Date(Date.UTC(
    end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()
  ));

  while (current <= last) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) {
      days.push(toNepalStartOfDay(current));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
};

const markLeaveDays = async (
  employeeId: string,
  startDate: Date,
  endDate: Date,
): Promise<void> => {
  const days = getWorkingDays(startDate, endDate);
  for (const date of days) {
    await prisma.workRecord.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: { employeeId, date, status: 'LEAVE', totalHours: 0 },
      update: { status: 'LEAVE' },
    });
  }
};

const removeLeaveDays = async (
  employeeId: string,
  startDate: Date,
  endDate: Date,
): Promise<void> => {
  const days = getWorkingDays(startDate, endDate);
  await prisma.workRecord.deleteMany({
    where: {
      employeeId,
      date: { in: days },
      status: 'LEAVE',
    },
  });
};

export const createRequest = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    const { startDate, endDate, reason } = req.body;

    if (!employeeId) {
      return res.status(403).json({ msg: "No employee profile linked" });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ msg: "startDate and endDate are required" });
    }

    const normalizedStart = toNepalStartOfDay(new Date(startDate));
    const normalizedEnd   = toNepalStartOfDay(new Date(endDate));

    if (isNaN(normalizedStart.getTime()) || isNaN(normalizedEnd.getTime())) {
      return res.status(400).json({ msg: "Invalid date format" });
    }

    if (normalizedEnd < normalizedStart) {
      return res.status(400).json({ msg: "endDate cannot be before startDate" });
    }

    const request = await prisma.holiday.create({
      data: {
        employeeId,
        startDate: normalizedStart,
        endDate:   normalizedEnd,
        reason,
      },
    });

    return res.status(201).json(request);  // ✅ added return
  } catch (error) {
    console.error(error);  // ✅ log the actual error
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

export const getMyRequests = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return res.status(403).json({ msg: "No employee profile linked" });
    }

    const requests = await prisma.holiday.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(requests);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

export const getAllRequests = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ msg: "Admins only" });
    }

    const requests = await prisma.holiday.findMany({
      where: {
        employee: { isActive: true } // 👈 ONLY show requests for active employees
      },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { name: true, department: true } },
      },
    });

    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ msg: "Admins only" });
    }
    
    const { id } = req.params;
    const { status, adminNote } = req.body;
    
    const holiday = await prisma.holiday.findUnique({
      where: { id: Number(id) },
      include: { employee: true }
    });

    if (!holiday?.employee.isActive) {
      return res.status(400).json({ msg: "Cannot modify requests for inactive employees" });
    }
    if (!status) {
      return res.status(400).json({ msg: "Status is required" });
    }

    const validStatuses = ['APPROVED', 'REJECTED', 'PENDING'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ msg: `Status must be one of: ${validStatuses.join(', ')}` });
    }
    
    const updated = await prisma.holiday.update({
      where: { id: Number(id) },
      data: { status, adminNote },
      include: {
        employee: { select: { name: true, department: true } },
      },
    });

    if (status === 'APPROVED') {
      await markLeaveDays(updated.employeeId, updated.startDate, updated.endDate);
    } else {
      // REJECTED or PENDING both remove leave day records
      await removeLeaveDays(updated.employeeId, updated.startDate, updated.endDate);
    }

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};