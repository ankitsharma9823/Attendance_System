// import { Request, Response } from "express";
// import {
//   setDeviceTime,
//   getDeviceTime,
//   getDeviceInfo,
//   getDeviceUsers,
//   deleteDeviceUser,
//   clearDeviceLogs,
//   rebootDevice,
//   disableDevice,
//   enableDevice,
// } from "./device.engine";

// export const syncTime = async (_req: Request, res: Response) => {
//   try {
//     await setDeviceTime();
//     res.json({ success: true, message: "Device time synced.", syncedAt: new Date() });
//   } catch (e: any) {
//     res.status(500).json({ success: false, message: e.message });
//   }
// };

// export const fetchTime = async (_req: Request, res: Response) => {
//   try {
//     const time = await getDeviceTime();
//     res.json({ success: true, deviceTime: time });
//   } catch (e: any) {
//     res.status(500).json({ success: false, message: e.message });
//   }
// };

// export const fetchInfo = async (_req: Request, res: Response) => {
//   try {
//     const info = await getDeviceInfo();
//     res.json({ success: true, data: info });
//   } catch (e: any) {
//     res.status(500).json({ success: false, message: e.message });
//   }
// };

// export const fetchUsers = async (_req: Request, res: Response) => {
//   try {
//     const users = await getDeviceUsers();
//     res.json({ success: true, count: users.length, data: users });
//   } catch (e: any) {
//     res.status(500).json({ success: false, message: e.message });
//   }
// };

// export const removeUser = async (req: Request, res: Response) => {
//   try {
//     const uid = parseInt(req.params.uid as string);
//     if (isNaN(uid)) {
//       res.status(400).json({ success: false, message: "Invalid uid." });
//       return;
//     }
//     await deleteDeviceUser(uid);
//     res.json({ success: true, message: `User ${uid} deleted from device.` });
//   } catch (e: any) {
//     res.status(500).json({ success: false, message: e.message });
//   }
// };

// export const purgeLogs = async (_req: Request, res: Response) => {
//   try {
//     await clearDeviceLogs();
//     res.json({ success: true, message: "Device logs cleared." });
//   } catch (e: any) {
//     res.status(500).json({ success: false, message: e.message });
//   }
// };

// export const reboot = async (_req: Request, res: Response) => {
//   try {
//     await rebootDevice();
//     res.json({ success: true, message: "Device reboot triggered." });
//   } catch (e: any) {
//     res.status(500).json({ success: false, message: e.message });
//   }
// };

// export const disable = async (_req: Request, res: Response) => {
//   try {
//     await disableDevice();
//     res.json({ success: true, message: "Device disabled." });
//   } catch (e: any) {
//     res.status(500).json({ success: false, message: e.message });
//   }
// };

// export const enable = async (_req: Request, res: Response) => {
//   try {
//     await enableDevice();
//     res.json({ success: true, message: "Device enabled." });
//   } catch (e: any) {
//     res.status(500).json({ success: false, message: e.message });
//   }
// };

import { Request, Response } from "express";
import {
  setDeviceTime,
  getDeviceTime,
  getDeviceInfo,
  getDeviceUsers,
  deleteDeviceUser,
  clearDeviceLogs,
  rebootDevice,
  disableDevice,
  enableDevice,
} from "./device.engine";

export const syncTime = async (_req: Request, res: Response) => {
  try {
    await setDeviceTime();
    res.json({ success: true, message: "Device time synced.", syncedAt: new Date() });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const fetchTime = async (_req: Request, res: Response) => {
  try {
    const time = await getDeviceTime();
    res.json({ success: true, deviceTime: time });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const fetchInfo = async (_req: Request, res: Response) => {
  try {
    const info = await getDeviceInfo();
    res.json({ success: true, data: info });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const fetchUsers = async (_req: Request, res: Response) => {
  try {
    const users = await getDeviceUsers();
    res.json({ success: true, count: users.length, data: users });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const removeUser = async (req: Request, res: Response) => {
  try {
    const uid = parseInt(req.params.uid as string);
    if (isNaN(uid)) {
      res.status(400).json({ success: false, message: "Invalid uid." });
      return;
    }
    await deleteDeviceUser(uid);
    res.json({ success: true, message: `User ${uid} deleted from device.` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const purgeLogs = async (_req: Request, res: Response) => {
  try {
    await clearDeviceLogs();
    res.json({ success: true, message: "Device logs cleared." });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const reboot = async (_req: Request, res: Response) => {
  try {
    await rebootDevice();
    res.json({ success: true, message: "Device reboot triggered." });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const disable = async (_req: Request, res: Response) => {
  try {
    await disableDevice();
    res.json({ success: true, message: "Device disabled." });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const enable = async (_req: Request, res: Response) => {
  try {
    await enableDevice();
    res.json({ success: true, message: "Device enabled." });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};