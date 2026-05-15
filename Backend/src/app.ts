// import express from "express";
// import cors from "cors";
// import attendanceRoutes from "./modules/attendance/attendance.routes";
// import deviceRoutes from "./modules/device/device.route";
// import machineRoutes from "./modules/machine/machine.route";
// import authRoutes from "./modules/auth/auth.route";

// const app = express();

// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     credentials: true,
//   }),
// );

// app.use(express.json());

// app.use("/api/attendance", attendanceRoutes);
// app.use("/api/device", deviceRoutes);
// app.use("/api/machine", machineRoutes);
// app.use("/api/auth", authRoutes);

// export default app;

import express from "express";
import cors from "cors";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import deviceRoutes     from "./modules/device/device.route";
import machineRoutes    from "./modules/machine/machine.route";
import authRoutes       from "./modules/auth/auth.route";

const app = express();

app.use(cors({
  // FIX: Read origin from env instead of hardcoding localhost
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());

app.use("/api/attendance", attendanceRoutes);
app.use("/api/device",     deviceRoutes);
app.use("/api/machine",    machineRoutes);
app.use("/api/auth",       authRoutes);

// FIX: Added health check endpoint
app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date() }));

export default app;