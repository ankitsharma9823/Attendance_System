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
import deviceRoutes from "./modules/device/device.route";
import authRoutes from "./modules/auth/auth.route";
import scheduleRoutes from "./modules/schedule/schedule.router";
import holidayRoute from "./modules/holiday/holiday.route"
import { apiLimiter } from "./middleware/rate-limit.middleware";

const app = express();
app.use(
  cors({
    origin: (origin, callback) => callback(null, true), // allow all
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204,
  }),
);

app.use("/api", apiLimiter);

app.use(express.json());
app.use("/api/attendance", attendanceRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/v1/holiday",holidayRoute)
app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date() }),
);

export default app;
