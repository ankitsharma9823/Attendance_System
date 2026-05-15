import express from "express";
import cors from "cors";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import deviceRoutes from "./modules/device/device.route";
import machineRoutes from "./modules/machine/machine.route";
import authRoutes from "./modules/auth/auth.route";
const app = express();
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(express.json());
app.use("/api/attendance", attendanceRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/machine", machineRoutes);
app.use("/api/auth", authRoutes);
export default app;
