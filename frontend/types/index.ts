export type AttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY' | 'EARLY_LEAVE' | 'ABSENT';

export interface WorkRecord {
  id: number;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakIn: string | null;
  breakOut: string | null;
  overtime: number;
  isOvertime: boolean;
  isHalfDay: boolean;
  status: AttendanceStatus;
  employee?: {
    name: string;
    department: string;
  };
}

export interface YearlyAttendanceStat {
  month: string;
  present: number;
  late: number;
  absent: number;
  half_day: number;
  early_leave: number;
}
