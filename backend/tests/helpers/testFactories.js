/**
 * Test Data Factories
 * Generate valid test data objects with sensible defaults
 */

/**
 * Creates a valid user object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} User object
 */
function createUserData(overrides = {}) {
  const timestamp = Date.now();
  return {
    email: `testuser${timestamp}@school.com`,
    username: `testuser${timestamp}`,
    firstName: 'Test',
    lastName: 'User',
    role: 'Student',
    password: 'TestPass123!',
    status: 'Active',
    isVerified: true,
    mustSetPassword: false,
    ...overrides
  };
}

/**
 * Creates a valid student object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Student object
 */
function createStudentData(overrides = {}) {
  const timestamp = Date.now();
  return {
    email: `student${timestamp}@school.com`,
    username: `student${timestamp}`,
    firstName: 'John',
    lastName: 'Doe',
    role: 'Student',
    grade: 'Grade 10',
    section: 'A',
    rollNumber: `2025${timestamp.toString().slice(-3)}`,
    dateOfBirth: '2010-01-01',
    gender: 'Male',
    address: '123 Test Street',
    phone: '+251912345678',
    status: 'Active',
    ...overrides
  };
}

/**
 * Creates a valid teacher object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Teacher object
 */
function createTeacherData(overrides = {}) {
  const timestamp = Date.now();
  return {
    email: `teacher${timestamp}@school.com`,
    username: `teacher${timestamp}`,
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'Teacher',
    subject: 'Mathematics',
    qualification: 'MSc in Mathematics',
    dateOfBirth: '1985-05-15',
    gender: 'Female',
    phone: '+251911111111',
    status: 'Active',
    ...overrides
  };
}

/**
 * Creates a valid academic record object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Academic record object
 */
function createAcademicRecordData(overrides = {}) {
  return {
    subject: 'Mathematics',
    academicYear: '2025-2026',
    semester: 'Semester 1',
    marks: {
      midExam: 17,        // out of 20
      finalExam: 34,      // out of 40
      classQuiz: 8,       // out of 10
      continuousAssessment: 8, // out of 10
      assignment: 18      // out of 20
    }, // Total: 85/100
    status: 'Draft',
    comments: 'Good progress',
    ...overrides
  };
}

/**
 * Creates a valid attendance record object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Attendance record object
 */
function createAttendanceData(overrides = {}) {
  return {
    date: new Date().toISOString().split('T')[0],
    status: 'Present',
    period: 1,
    subject: 'Mathematics',
    remarks: '',
    ...overrides
  };
}

/**
 * Creates a valid parent object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Parent object
 */
function createParentData(overrides = {}) {
  const timestamp = Date.now();
  return {
    email: `parent${timestamp}@school.com`,
    username: `parent${timestamp}`,
    firstName: 'Parent',
    lastName: 'Guardian',
    role: 'Parent',
    occupation: 'Engineer',
    phone: '+251922222222',
    relationship: 'Father',
    status: 'Active',
    ...overrides
  };
}

/**
 * Creates a valid timetable entry object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Timetable object
 */
function createTimetableData(overrides = {}) {
  return {
    class: 'Grade 10 A',
    day: 'Monday',
    period: 1,
    subject: 'Mathematics',
    startTime: '08:00',
    endTime: '08:45',
    room: 'Room 101',
    ...overrides
  };
}

/**
 * Creates a valid announcement object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Announcement object
 */
function createAnnouncementData(overrides = {}) {
  return {
    title: 'Test Announcement',
    content: 'This is a test announcement content',
    targetRoles: ['Student', 'Teacher'],
    priority: 'Medium',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    ...overrides
  };
}

/**
 * Creates a valid message object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Message object
 */
function createMessageData(overrides = {}) {
  return {
    subject: 'Test Message',
    body: 'This is a test message body',
    readStatus: false,
    ...overrides
  };
}

/**
 * Creates a valid certificate object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Certificate object
 */
function createCertificateData(overrides = {}) {
  const timestamp = Date.now();
  return {
    type: 'Completion',
    certificateNumber: `CERT${timestamp}`,
    issueDate: new Date().toISOString().split('T')[0],
    status: 'Draft',
    remarks: 'Test certificate',
    ...overrides
  };
}

/**
 * Creates a valid exam schedule object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Exam schedule object
 */
function createExamScheduleData(overrides = {}) {
  return {
    examName: 'Mathematics Midterm Exam',
    subject: 'Mathematics',
    examType: 'Midterm',
    grade: 10,
    section: 'A',
    academicYear: '2025-2026',
    semester: 'Semester 1',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '11:00',
    duration: 120,
    room: 'Exam Hall 1',
    maxMarks: 100,
    ...overrides
  };
}

/**
 * Creates a valid report object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Report object
 */
function createReportData(overrides = {}) {
  return {
    type: 'Student Performance',
    title: 'Test Report',
    filters: {
      academicYear: '2025-2026',
      semester: 'Semester 1'
    },
    ...overrides
  };
}

/**
 * Creates a valid academic year object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Academic year object
 */
function createAcademicYearData(overrides = {}) {
  const currentYear = new Date().getFullYear();
  return {
    year: `${currentYear}-${currentYear + 1}`,
    startDate: `${currentYear}-09-01`,
    endDate: `${currentYear + 1}-06-30`,
    isActive: false,
    ...overrides
  };
}

/**
 * Creates a valid absence alert object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Absence alert object
 */
function createAbsenceAlertData(overrides = {}) {
  return {
    date: new Date().toISOString().split('T')[0],
    reason: 'Absent without notice',
    status: 'Pending',
    notificationSent: false,
    ...overrides
  };
}

module.exports = {
  createUserData,
  createStudentData,
  createTeacherData,
  createAcademicRecordData,
  createAttendanceData,
  createParentData,
  createTimetableData,
  createAnnouncementData,
  createMessageData,
  createCertificateData,
  createExamScheduleData,
  createReportData,
  createAcademicYearData,
  createAbsenceAlertData
};
