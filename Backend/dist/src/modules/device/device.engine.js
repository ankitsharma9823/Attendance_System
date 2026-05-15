// @ts-ignore
import ZKLib from "node-zklib";
import { DEVICE_CONFIG } from "../../config/device.config";
const withDevice = async (fn) => {
    const zk = new ZKLib(DEVICE_CONFIG.IP, DEVICE_CONFIG.PORT, DEVICE_CONFIG.TIMEOUT, DEVICE_CONFIG.IN_PORT);
    try {
        await zk.createSocket();
        return await fn(zk);
    }
    finally {
        try {
            await zk.disconnect();
        }
        catch (_) { }
    }
};
// ── Correct command codes from constants.js ───────────────────────────────────
const CMD_GET_TIME = 201;
const CMD_SET_TIME = 202;
const CMD_DELETE_USER = 18;
const CMD_RESTART = 1004;
// ── Nepal time (UTC+5:45) ─────────────────────────────────────────────────────
export const getNepaliDate = () => {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const nepalOffsetMs = (5 * 60 + 45) * 60000;
    return new Date(utcMs + nepalOffsetMs);
};
// ── ZK time encoding: seconds since 2000-01-01 ───────────────────────────────
const ZK_EPOCH = new Date(2000, 0, 1).getTime();
const encodeZKTime = (date) => {
    const seconds = Math.floor((date.getTime() - ZK_EPOCH) / 1000);
    console.log(`[Device] 🔍 Encoding: ${date.toLocaleString()} → ${seconds}s`);
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(seconds, 0);
    return buf;
};
const decodeZKTime = (buf) => {
    const seconds = buf.readUInt32LE(0);
    console.log(`[Device] 🔍 Decoding: ${seconds}s → ${new Date(ZK_EPOCH + seconds * 1000).toLocaleString()}`);
    return new Date(ZK_EPOCH + seconds * 1000);
};
// ── Time ──────────────────────────────────────────────────────────────────────
export const setDeviceTime = async (date) => {
    await withDevice(async (zk) => {
        const localDate = date ?? getNepaliDate();
        console.log(`[Device] 🕐 Setting Nepal time: ${localDate.toLocaleString()}`);
        await zk.disableDevice();
        const buf = encodeZKTime(localDate);
        console.log(`[Device] 🔍 Sending hex: ${buf.toString("hex")}`);
        await zk.executeCmd(CMD_SET_TIME, buf);
        await zk.enableDevice();
        console.log(`[Device] ✅ Time set successfully`);
    });
};
export const getDeviceTime = async () => {
    return await withDevice(async (zk) => {
        const res = await zk.executeCmd(CMD_GET_TIME, "");
        const buf = Buffer.isBuffer(res) ? res : Buffer.from(res.data);
        console.log(`[Device] 🔍 Raw hex: ${buf.toString("hex")} length: ${buf.length}`);
        // Response is 12 bytes — time is echoed back at offset 8
        const timeBuf = buf.slice(8, 12);
        console.log(`[Device] 🔍 Time bytes: ${timeBuf.toString("hex")}`);
        return decodeZKTime(timeBuf);
    });
};
// ── Info ──────────────────────────────────────────────────────────────────────
export const getDeviceInfo = async () => {
    return await withDevice(async (zk) => {
        const info = await zk.getInfo();
        console.log("[Device] 📋 Info fetched:", info);
        return info;
    });
};
// ── Users ─────────────────────────────────────────────────────────────────────
export const getDeviceUsers = async () => {
    return await withDevice(async (zk) => {
        const result = await zk.getUsers();
        return result?.data ?? [];
    });
};
export const deleteDeviceUser = async (uid) => {
    await withDevice(async (zk) => {
        const buf = Buffer.alloc(2);
        buf.writeUInt16LE(uid, 0);
        await zk.executeCmd(CMD_DELETE_USER, buf);
        console.log(`[Device] 🗑️  User ${uid} deleted from device.`);
    });
};
// ── Logs ──────────────────────────────────────────────────────────────────────
export const clearDeviceLogs = async () => {
    await withDevice(async (zk) => {
        await zk.clearAttendanceLog();
        console.log("[Device] 🧹 Attendance logs cleared from device.");
    });
};
// ── Power ─────────────────────────────────────────────────────────────────────
export const rebootDevice = async () => {
    await withDevice(async (zk) => {
        await zk.executeCmd(CMD_RESTART, "");
        console.log("[Device] 🔄 Device reboot triggered.");
    });
};
// ── Device Control ────────────────────────────────────────────────────────────
export const disableDevice = async () => {
    await withDevice(async (zk) => {
        await zk.disableDevice();
        console.log("[Device] 🔒 Device disabled.");
    });
};
export const enableDevice = async () => {
    await withDevice(async (zk) => {
        await zk.enableDevice();
        console.log("[Device] 🔓 Device enabled.");
    });
};
