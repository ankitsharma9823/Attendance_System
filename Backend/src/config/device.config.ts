// export const DEVICE_CONFIG = {
//   IP: process.env.DEVICE_IP || "192.168.1.201",
//   PORT: parseInt(process.env.DEVICE_PORT || "4370"),
//   TIMEOUT: parseInt(process.env.DEVICE_TIMEOUT || "30000"),
//   IN_PORT: parseInt(process.env.DEVICE_IN_PORT || "4000"),
//   INTERVAL: parseInt(process.env.SYNC_INTERVAL || "120000"),
// };

// export let lastSyncTime: Date | null = null;
// export const setLastSyncTime = (d: Date | null) => { lastSyncTime = d; };

import fs from "fs";
import path from "path";

export const DEVICE_CONFIG = {
  IP: process.env.DEVICE_IP || "192.168.1.201",
  PORT: parseInt(process.env.DEVICE_PORT || "4370"),
  TIMEOUT: parseInt(process.env.DEVICE_TIMEOUT || "30000"),
  IN_PORT: parseInt(process.env.DEVICE_IN_PORT || "4000"),
  INTERVAL: parseInt(process.env.SYNC_INTERVAL || "120000"),
};

const SYNC_STATE_FILE = path.join(process.cwd(), ".sync-state.json");

interface SyncState {
  lastSyncTime: string | null;
  lastSyncSn: number;
}

const loadSyncState = (): SyncState => {
  try {
    if (fs.existsSync(SYNC_STATE_FILE)) {
      const data = fs.readFileSync(SYNC_STATE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("[Config] Failed to load sync state, using defaults:", err);
  }
  return { lastSyncTime: null, lastSyncSn: 0 };
};

const saveSyncState = (state: SyncState) => {
  try {
    fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("[Config] Failed to save sync state:", err);
  }
};

let syncState = loadSyncState();

export let lastSyncTime: Date | null = syncState.lastSyncTime ? new Date(syncState.lastSyncTime) : null;
export const setLastSyncTime = (d: Date | null) => {
  lastSyncTime = d;
  syncState.lastSyncTime = d ? d.toISOString() : null;
  saveSyncState(syncState);
};

export let lastSyncSn: number = syncState.lastSyncSn;
export const setLastSyncSn = (sn: number) => {
  lastSyncSn = sn;
  syncState.lastSyncSn = sn;
  saveSyncState(syncState);
};
