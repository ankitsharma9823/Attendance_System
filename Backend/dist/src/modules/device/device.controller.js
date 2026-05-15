import { setDeviceTime, getDeviceTime, getDeviceInfo, getDeviceUsers, deleteDeviceUser, clearDeviceLogs, rebootDevice, disableDevice, enableDevice, } from "./device.engine";
export const syncTime = async (_req, res) => {
    try {
        await setDeviceTime();
        res.json({ success: true, message: "Device time synced.", syncedAt: new Date() });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
export const fetchTime = async (_req, res) => {
    try {
        const time = await getDeviceTime();
        res.json({ success: true, deviceTime: time });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
export const fetchInfo = async (_req, res) => {
    try {
        const info = await getDeviceInfo();
        res.json({ success: true, data: info });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
export const fetchUsers = async (_req, res) => {
    try {
        const users = await getDeviceUsers();
        res.json({ success: true, count: users.length, data: users });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
export const removeUser = async (req, res) => {
    try {
        const uid = parseInt(req.params.uid);
        if (isNaN(uid)) {
            res.status(400).json({ success: false, message: "Invalid uid." });
            return;
        }
        await deleteDeviceUser(uid);
        res.json({ success: true, message: `User ${uid} deleted from device.` });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
export const purgeLogs = async (_req, res) => {
    try {
        await clearDeviceLogs();
        res.json({ success: true, message: "Device logs cleared." });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
export const reboot = async (_req, res) => {
    try {
        await rebootDevice();
        res.json({ success: true, message: "Device reboot triggered." });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
export const disable = async (_req, res) => {
    try {
        await disableDevice();
        res.json({ success: true, message: "Device disabled." });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
export const enable = async (_req, res) => {
    try {
        await enableDevice();
        res.json({ success: true, message: "Device enabled." });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
