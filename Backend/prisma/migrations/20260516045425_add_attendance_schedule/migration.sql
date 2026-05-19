-- AlterTable
ALTER TABLE "WorkRecord" ADD COLUMN     "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isOvertime" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AttendanceSchedule" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "checkInStart" TEXT NOT NULL,
    "checkInEnd" TEXT NOT NULL,
    "breakInStart" TEXT NOT NULL,
    "breakInEnd" TEXT NOT NULL,
    "breakOutStart" TEXT NOT NULL,
    "breakOutEnd" TEXT NOT NULL,
    "checkOutStart" TEXT NOT NULL,
    "checkOutEnd" TEXT NOT NULL,
    "minIntervalMinutes" INTEGER NOT NULL DEFAULT 5,
    "halfDayMinutes" INTEGER NOT NULL DEFAULT 240,
    "maxPunchesPerDay" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSchedule_pkey" PRIMARY KEY ("id")
);
