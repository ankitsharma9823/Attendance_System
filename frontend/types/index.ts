export type AttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY' | 'EARLY_LEAVE' | 'ABSENT' | 'LEAVE';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  employeeId: string;
}

export interface WorkRecord {
  id: number | null;
  employeeId: string;
  name?: string;          
  department?: string;    
  position?: string;    
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakIn: string | null;
  breakOut: string | null;
  overtime: number;
  isOvertime: boolean;
  isHalfDay: boolean;
  totalHours: number;
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