export const DEVICE_CONFIG = {
    IP: process.env.DEVICE_IP || "192.168.1.201",
    PORT: parseInt(process.env.DEVICE_PORT || "4370"),
    TIMEOUT: parseInt(process.env.DEVICE_TIMEOUT || "30000"),
    IN_PORT: parseInt(process.env.DEVICE_IN_PORT || "4000"),
    INTERVAL: parseInt(process.env.SYNC_INTERVAL || "120000"),
};
export let lastSyncTime = null;
export const setLastSyncTime = (d) => { lastSyncTime = d; };
