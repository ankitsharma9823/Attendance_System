import { Request, Response } from "express";
import { deviceService } from "./device.service";

// Extract a scalar string from any Express query param value.
// Casting through `unknown` is the correct pattern for ParsedQs → string narrowing.
const queryString = (val: unknown): string | undefined => {
  if (typeof val === "string") return val;
  if (Array.isArray(val) && typeof val[0] === "string") return val[0];
  return undefined;
};

export class DeviceController {
  async syncLogs(req: Request, res: Response) {
    try {
      const result = await deviceService.syncLogs();
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async syncTime(req: Request, res: Response) {
    try {
      const result = await deviceService.syncTime();
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getMachineTime(req: Request, res: Response) {
    try {
      const result = await deviceService.getMachineTime();
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        status: "OFFLINE",
        message: "Could not communicate with machine.",
        error: error.message,
      });
    }
  }

  async resetCursors(req: Request, res: Response) {
    try {
      const raw = queryString(req.query["replay"]) ?? "5";
      const replay = Math.min(parseInt(raw, 10) || 5, 50);
      const result = await deviceService.resetCursors(replay);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async purgeDatabase(req: Request, res: Response) {
    try {
      const counts = await deviceService.purgeDatabase();
      return res.status(200).json({
        success: true,
        message:
          "Automated purge complete. Database records dropped and sync cursors reset to zero.",
        analytics: {
          purgedHistoricalRows: counts.historicalRows,
          purgedCurrentRows: counts.currentRows,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
async getUsers(req: Request, res: Response) {
  try {
    const page = parseInt(queryString(req.query["page"]) || "1", 10);
    const limit = parseInt(queryString(req.query["limit"]) || "10", 10);
    
    const result = await deviceService.getUsers(page, limit);
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

  async addUser(req: Request, res: Response) {
  const { name, role } = req.body;

  if (!name || String(name).trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "Name field is required." });
  }

  const parsedRole = role !== undefined ? parseInt(String(role), 10) : 0;

  try {
    const result = await deviceService.addUser(name, isNaN(parsedRole) ? 0 : parsedRole);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

  async updateUser(req: Request, res: Response) {
    const { name, uid, role } = req.body;
    // Cast explicitly to string to satisfy strict string parameters
    const userid = String(req.params.id);

    if (!name || !uid) {
      return res
        .status(400)
        .json({ success: false, message: "name and uid are required for update." });
    }

    const parsedUid = parseInt(String(uid), 10);
    const parsedRole = role !== undefined ? parseInt(String(role), 10) : 0;

    if (isNaN(parsedUid) || parsedUid <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "uid must be a positive integer." });
    }

    try {
      const result = await deviceService.updateUser(
        parsedUid,
        userid,
        name,
        isNaN(parsedRole) ? 0 : parsedRole,
      );
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
async deleteUser(req: Request, res: Response) {
    try {
      // 1. Safely extract the string ID from the route path (e.g., "1" or "EMP-004")
      const userid = req.params && req.params.id ? String(req.params.id) : "";

      if (!userid) {
        return res.status(400).json({ success: false, message: "User parameter ID is missing from URL path." });
      }

      // 2. Safely extract the numeric UID if sent via query or body without breaking on undefined objects
      let rawUid: any = undefined;
      
      if (req.query && req.query["uid"]) {
        rawUid = queryString(req.query["uid"]);
      } else if (req.body && req.body.uid !== undefined) {
        rawUid = req.body.uid;
      }

      // 3. Attempt parsing. If it's missing, pass NaN. Our engine's lookup handler will find it safely.
      let parsedUid = rawUid !== undefined ? parseInt(String(rawUid), 10) : NaN;
      if (isNaN(parsedUid) || parsedUid <= 0) {
        parsedUid = NaN;
      }

      console.log(`[Device Controller] Deletion pipeline validated. User ID: "${userid}", Extracted UID: ${parsedUid}`);

      // 4. Fire to service layer
      const result = await deviceService.deleteUser(parsedUid, userid);
      return res.status(200).json(result);

    } catch (error: any) {
      console.error("[Device Controller] Deletion pipeline caught an uncaught exception:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "An unexpected error occurred during user profile cleanup.",
      });
    }
  };

  async clearFingerprint(req: Request, res: Response) {
    const { uid } = req.body;

    if (!uid) {
      return res
        .status(400)
        .json({ success: false, message: "Internal machine UID is required." });
    }

    const parsedUid = parseInt(String(uid), 10);
    if (isNaN(parsedUid) || parsedUid <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "uid must be a positive integer." });
    }

    try {
      const result = await deviceService.clearFingerprint(parsedUid);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

export const deviceController = new DeviceController();