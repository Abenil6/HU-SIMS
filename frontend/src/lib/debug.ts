/**
 * Debug logging utility for SIMS application
 * Toggle DEBUG_MODE to enable/disable all debug logs
 */

export const DEBUG_MODE = true;

type DebugLogger = (...args: any[]) => void;

export const createDebugger = (prefix: string): DebugLogger => {
  return (...args: any[]) => {
    if (DEBUG_MODE) {
      console.log(`[${prefix}]`, ...args);
    }
  };
};

// Pre-configured debuggers for different modules
export const debug = {
  examSchedule: createDebugger('ExamSchedule'),
  academicYear: createDebugger('AcademicYear'),
  absenceAlert: createDebugger('AbsenceAlert'),
  auth: createDebugger('Auth'),
  api: createDebugger('API'),
  student: createDebugger('Student'),
  teacher: createDebugger('Teacher'),
  parent: createDebugger('Parent'),
  attendance: createDebugger('Attendance'),
  grade: createDebugger('Grade'),
};

export default debug;
