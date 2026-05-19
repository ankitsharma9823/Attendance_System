import prisma from "../../config/db";
import {
  syncWithMachine,
  syncEmployeesFromDevice,
  getDeviceUsers,
  addDeviceUser,
  updateDeviceUser,
  deleteDeviceUser,
  clearDeviceFingerprint,
  getDeviceTime,
  setDeviceTime,
  getNepaliDate,
} from "./device.engine";
import { resetSyncCursors } from "../../config/device.config";

export class DeviceService {
  async syncLogs() {
    return await syncWithMachine();
  }

  async syncTime() {
    const syncedAt = await setDeviceTime();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) =>
      `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return {
      success: true,
      message: "Device clock synced to Nepal time.",
      deviceTime: fmt(syncedAt),
    };
  }

  async getMachineTime() {
    const deviceTime = await getDeviceTime();
    const serverNepal = getNepaliDate();
    const driftMinutes = Math.round(
      Math.abs(deviceTime.getTime() - serverNepal.getTime()) / 60_000,
    );
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) =>
      `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return {
      success: true,
      status: "ONLINE",
      deviceTime: fmt(deviceTime),
      serverNepalTime: fmt(serverNepal),
      driftMinutes,
    };
  }

  async resetCursors(replay: number = 5) {
    resetSyncCursors(replay);
    return {
      success: true,
      message: `Next sync will re-import the last ${replay} punch(es) from the device.`,
    };
  }

  async syncEmployees() {
    return await syncEmployeesFromDevice();
  }

  async purgeDatabase() {
    const nepalNow = getNepaliDate();
    const currentYearStart = new Date(nepalNow.getFullYear(), 0, 1);

    const [historicalResult, currentResult] = await prisma.$transaction([
      prisma.workRecord.deleteMany({
        where: { date: { lt: currentYearStart } },
      }),
      prisma.workRecord.deleteMany({
        where: { date: { gte: currentYearStart } },
      }),
    ]);

    resetSyncCursors(0);

    return {
      historicalRows: historicalResult.count,
      currentRows: currentResult.count,
    };
  }

  async getUsers() {
    return await getDeviceUsers();
  }

  async addUser(name: string, role: number = 0) {
    return await addDeviceUser(name, role);
  }

  async updateUser(uid: number, userid: string, name: string, role: number = 0) {
    return await updateDeviceUser(uid, userid, name, role);
  }

  // FIX: Parameter typed as 'any' or 'number | typeof NaN' to prevent internal pipeline crash
  async deleteUser(uid: any, userid: string) {
    return await deleteDeviceUser(uid, userid);
  }

  async clearFingerprint(uid: number) {
    return await clearDeviceFingerprint(uid);
  }
}

export const deviceService = new DeviceService();