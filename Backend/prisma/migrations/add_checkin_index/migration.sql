-- Add index on employeeId and checkIn for faster duplicate detection
CREATE INDEX IF NOT EXISTS "WorkRecord_employeeId_checkIn_idx" ON "WorkRecord"("employeeId", "checkIn");
