import { Response } from 'express';
import { prisma } from '../../config/db';
import { AuthRequest } from '../../middleware/auth.middleware';

// Employee: submit a leave request
export const createRequest = async (req: AuthRequest, res: Response) => {
  try {
    console.log("req.user",req.user);
    const employeeId = req.user?.employeeId;
    const { startDate, endDate, reason } = req.body;

    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const request = await prisma.holiday.create({
      data: {
        employeeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
      }
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Employee: see only their own requests
export const getMyRequests = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return res.status(403).json({ msg: "No employee profile linked" });

    const requests = await prisma.holiday.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Admin: see all requests from all employees
export const getAllRequests = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ msg: "Admins only" });
    }

    const requests = await prisma.holiday.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { name: true, department: true }
        }
      }
    });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Admin: approve/reject and optionally add a reply note
export const updateStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ msg: "Admins only" });
    }

    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!status) return res.status(400).json({ msg: "Status is required" });

    const updated = await prisma.holiday.update({
      where: { id: Number(id) },
      data: { status, adminNote },
      include: {
        employee: { select: { name: true, department: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
};