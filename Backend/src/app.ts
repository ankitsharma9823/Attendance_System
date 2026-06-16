import express from "express";
import cors from "cors";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import deviceRoutes from "./modules/device/device.route";
import authRoutes from "./modules/auth/auth.route";
import scheduleRoutes from "./modules/schedule/schedule.router";
import holidayRoute from "./modules/holiday/holiday.route"
import { apiLimiter } from "./middleware/rate-limit.middleware";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || "http://localhost:3000").split(",").map(s => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
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

app.use(errorHandler);

export default app;
