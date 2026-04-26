const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect, authorize, checkPermission, PERMISSIONS, RESOURCES } = require('../middleware/authMiddleware');
const { validateBody, validateParams, validateQuery } = require('../utils/validateInput');

const validateAttendanceId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateAttendanceCreate = validateBody({
  student: { required: true, type: 'objectId' },
  date: { required: true, type: 'date' },
  status: { required: true, type: 'string', enum: ['Present', 'Absent', 'Late', 'Excused'] },
  period: { type: 'number', min: 1, max: 20 },
  subject: { type: 'string', trim: true, maxLength: 120 },
  remarks: { type: 'string', trim: true, maxLength: 2000 },
}, { allowUnknown: true });

const validateBulkAttendance = validateBody({
  date: { required: true, type: 'date' },
  period: { type: 'number', min: 1, max: 20 },
  subject: { type: 'string', trim: true, maxLength: 120 },
  records: { required: true, type: 'array', minItems: 1, maxItems: 1000 },
}, { allowUnknown: true });

const validateSyncAttendance = validateBody({
  offlineRecords: { required: true, type: 'array', minItems: 1, maxItems: 2000 },
}, { allowUnknown: true });

const validateAttendanceQuery = validateQuery({
  student: { type: 'objectId' },
  date: { type: 'date' },
  period: { type: 'number', min: 1, max: 20 },
}, { allowUnknown: true });

const validateSummaryStudentQuery = validateQuery({
  studentId: { type: 'objectId' },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
}, { allowUnknown: true });

const validateSummaryClassQuery = validateQuery({
  className: { type: 'string', trim: true, maxLength: 120 },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
  month: { type: 'number', min: 1, max: 12 },
}, { allowUnknown: true });

const validateSummaryClassesQuery = validateQuery({
  days: { type: 'number', min: 1, max: 3650 },
}, { allowUnknown: true });

const validateDailyReportQuery = validateQuery({
  date: { required: true, type: 'date' },
  className: { type: 'string', trim: true, maxLength: 120 },
}, { allowUnknown: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     Attendance:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         student:
 *           type: string
 *           description: Student ID
 *         teacher:
 *           type: string
 *           description: Teacher ID
 *         date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [Present, Absent, Late, Excused]
 *         period:
 *           type: number
 *         subject:
 *           type: string
 *         remarks:
 *           type: string
 *     AttendanceCreate:
 *       type: object
 *       required:
 *         - student
 *         - date
 *         - status
 *       properties:
 *         student:
 *           type: string
 *         date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [Present, Absent, Late, Excused]
 *         period:
 *           type: number
 *         subject:
 *           type: string
 *         remarks:
 *           type: string
 *     BulkAttendance:
 *       type: object
 *       required:
 *         - date
 *         - records
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *         period:
 *           type: number
 *         subject:
 *           type: string
 *         records:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               student:
 *                 type: string
 *               status:
 *                 type: string
 *               remarks:
 *                 type: string
 */

router.use(protect);

/**
 * @swagger
 * /api/attendance/mark:
 *   post:
 *     summary: Mark single student attendance
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AttendanceCreate'
 *     responses:
 *       201:
 *         description: Attendance marked
 */
router.post('/mark', checkPermission(PERMISSIONS.WRITE, RESOURCES.ATTENDANCE), validateAttendanceCreate, attendanceController.markAttendance);

/**
 * @swagger
 * /api/attendance/bulk:
 *   post:
 *     summary: Bulk mark attendance for entire class
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkAttendance'
 *     responses:
 *       201:
 *         description: Bulk attendance marked
 */
router.post('/bulk', checkPermission(PERMISSIONS.WRITE, RESOURCES.ATTENDANCE), validateBulkAttendance, attendanceController.bulkMarkAttendance);

/**
 * @swagger
 * /api/attendance/sync:
 *   post:
 *     summary: Sync offline attendance records
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - offlineRecords
 *             properties:
 *               offlineRecords:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     student:
 *                       type: string
 *                     date:
 *                       type: string
 *                     status:
 *                       type: string
 *                     offlineId:
 *                       type: string
 *     responses:
 *       200:
 *         description: Records synced
 */
router.post('/sync', checkPermission(PERMISSIONS.WRITE, RESOURCES.ATTENDANCE), validateSyncAttendance, attendanceController.syncOfflineAttendance);

/**
 * @swagger
 * /api/attendance:
 *   get:
 *     summary: Get attendance records
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: student
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of attendance records
 */
router.get('/', checkPermission(PERMISSIONS.READ, RESOURCES.ATTENDANCE), validateAttendanceQuery, attendanceController.getAttendanceRecords);

/**
 * @swagger
 * /api/attendance/{id}:
 *   get:
 *     summary: Get attendance record by ID
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendance record
 */
router.get('/:id', checkPermission(PERMISSIONS.READ, RESOURCES.ATTENDANCE), validateAttendanceId, attendanceController.getAttendanceRecords);

/**
 * @swagger
 * /api/attendance/{id}:
 *   put:
 *     summary: Update attendance record
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendance updated
 */
router.put('/:id', checkPermission(PERMISSIONS.EDIT, RESOURCES.ATTENDANCE), validateAttendanceId, validateAttendanceCreate, attendanceController.updateAttendance);

/**
 * @swagger
 * /api/attendance/{id}:
 *   delete:
 *     summary: Delete attendance record
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendance deleted
 */
router.delete('/:id', checkPermission(PERMISSIONS.DELETE, RESOURCES.ATTENDANCE), validateAttendanceId, attendanceController.deleteAttendance);

/**
 * @swagger
 * /api/attendance/summary/student:
 *   get:
 *     summary: Get student attendance summary
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student attendance statistics
 */
router.get('/summary/student', checkPermission(PERMISSIONS.READ, RESOURCES.ATTENDANCE), validateSummaryStudentQuery, attendanceController.getStudentAttendanceSummary);

/**
 * @swagger
 * /api/attendance/summary/school:
 *   get:
 *     summary: Get school-wide attendance rate (last 30 days)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: School-wide attendance summary
 */
router.get('/summary/school', checkPermission(PERMISSIONS.READ, RESOURCES.ATTENDANCE), attendanceController.getSchoolAttendanceSummary);
router.get('/summary/school-admin-dashboard', checkPermission(PERMISSIONS.READ, RESOURCES.ATTENDANCE), attendanceController.getSchoolAdminAttendanceDashboard);
router.get('/summary/at-risk-trend', checkPermission(PERMISSIONS.READ, RESOURCES.ATTENDANCE), attendanceController.getAtRiskStudentsTrend);

/**
 * @swagger
 * /api/attendance/summary/classes:
 *   get:
 *     summary: Get attendance analytics across all classes (Admin)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Number of recent days to include (default 30)
 *     responses:
 *       200:
 *         description: Class attendance analytics
 */
router.get('/summary/classes', checkPermission(PERMISSIONS.READ, RESOURCES.ATTENDANCE), validateSummaryClassesQuery, attendanceController.getClassesAttendanceAnalytics);

/**
 * @swagger
 * /api/attendance/summary/class:
 *   get:
 *     summary: Get class attendance summary
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: className
 *         schema:
 *           type: string
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Class attendance statistics
 */
router.get('/summary/class', checkPermission(PERMISSIONS.READ, RESOURCES.ATTENDANCE), validateSummaryClassQuery, attendanceController.getClassAttendanceSummary);

/**
 * @swagger
 * /api/attendance/report/daily:
 *   get:
 *     summary: Get daily attendance report
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: className
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Daily attendance summary
 */
router.get('/report/daily', checkPermission(PERMISSIONS.READ, RESOURCES.ATTENDANCE), validateDailyReportQuery, attendanceController.getDailyReport);

/**
 * @swagger
 * /api/attendance/sync/pending:
 *   get:
 *     summary: Get unsynced offline records (Admin only)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of unsynced records
 */
router.get('/sync/pending', authorize('SchoolAdmin'), attendanceController.getUnsyncedRecords);

module.exports = router;
