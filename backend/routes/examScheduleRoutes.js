const express = require('express');
const router = express.Router();
const examScheduleController = require('../controllers/examScheduleController');
const { protect, authorize, checkPermission, PERMISSIONS, RESOURCES } = require('../middleware/authMiddleware');
const { validateBody, validateParams, validateQuery } = require('../utils/validateInput');

const validateExamScheduleId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateStudentParam = validateParams({
  studentId: { required: true, type: 'objectId' },
});

const validateExamQuery = validateQuery({
  grade: { type: 'string', trim: true, maxLength: 20 },
  section: { type: 'string', trim: true, maxLength: 60 },
  subject: { type: 'string', trim: true, maxLength: 120 },
  examType: { type: 'string', enum: ['Midterm', 'Final'] },
  startDate: { type: 'date' },
  endDate: { type: 'date' },
}, { allowUnknown: true });

const validateExamScheduleCreate = validateBody({
  subject: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 120 },
  grade: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 20 },
  section: { type: 'string', trim: true, maxLength: 60 },
  examType: { required: true, type: 'string', enum: ['Midterm', 'Final'] },
  date: { required: true, type: 'date' },
  startTime: { required: true, type: 'string', trim: true, maxLength: 20 },
  endTime: { required: true, type: 'string', trim: true, maxLength: 20 },
  duration: { type: 'number', min: 1, max: 600 },
  room: { type: 'string', trim: true, maxLength: 120 },
}, { allowUnknown: true });

const validateAutoGenerate = validateBody({
  grade: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 20 },
  section: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 60 },
  academicYear: { required: true, type: 'string', trim: true, maxLength: 30 },
  semester: { required: true, type: 'string', enum: ['Semester 1', 'Semester 2'] },
  examType: { required: true, type: 'string', enum: ['Midterm', 'Final'] },
  startDate: { required: true, type: 'date' },
  endDate: { required: true, type: 'date' },
}, { allowUnknown: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     ExamSchedule:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         subject:
 *           type: string
 *         grade:
 *           type: string
 *         section:
 *           type: string
 *           description: Section or stream (for Grade 11-12)
 *         examType:
 *           type: string
 *           enum: [Midterm, Final]
 *         date:
 *           type: string
 *           format: date
 *         startTime:
 *           type: string
 *         endTime:
 *           type: string
 *         duration:
 *           type: number
 *           description: Duration in minutes
 *         room:
 *           type: string
 *     ExamScheduleCreate:
 *       type: object
 *       required:
 *         - subject
 *         - grade
 *         - examType
 *         - date
 *         - startTime
 *         - endTime
 *       properties:
 *         subject:
 *           type: string
 *         grade:
 *           type: string
 *           description: Grade level (9, 10, 11, 12)
 *         section:
 *           type: string
 *           description: Section or stream (for Grade 11-12)
 *         examType:
 *           type: string
 *           enum: [Midterm, Final]
 *         date:
 *           type: string
 *           format: date
 *         startTime:
 *           type: string
 *         endTime:
 *           type: string
 *         duration:
 *           type: number
 *         room:
 *           type: string
 */

router.use(protect);

/**
 * @swagger
 * /api/exam-schedules:
 *   get:
 *     summary: Get all exam schedules
 *     tags: [Exam Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: grade
 *         schema:
 *           type: string
 *         description: Grade level (9, 10, 11, 12)
 *       - in: query
 *         name: section
 *         schema:
 *           type: string
 *         description: Section or stream (Natural/Social for Grade 11-12)
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *       - in: query
 *         name: examType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of exam schedules
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', checkPermission(PERMISSIONS.READ, RESOURCES.ACADEMIC_RECORDS), validateExamQuery, examScheduleController.getExamSchedules);

/**
 * @swagger
 * /api/exam-schedules:
 *   post:
 *     summary: Create exam schedule
 *     tags: [Exam Schedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExamScheduleCreate'
 *     responses:
 *       201:
 *         description: Exam schedule created
 *       400:
 *         description: Invalid input or schedule conflict
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', checkPermission(PERMISSIONS.WRITE, RESOURCES.ACADEMIC_RECORDS), validateExamScheduleCreate, examScheduleController.createExamSchedule);

router.get('/date-range', validateExamQuery, examScheduleController.getExamsByDateRange);
router.post('/auto-generate', checkPermission(PERMISSIONS.WRITE, RESOURCES.ACADEMIC_RECORDS), validateAutoGenerate, examScheduleController.autoGenerateSchedule);
router.post('/regenerate', checkPermission(PERMISSIONS.WRITE, RESOURCES.ACADEMIC_RECORDS), validateAutoGenerate, examScheduleController.regenerateSchedule);

/**
 * @swagger
 * /api/exam-schedules/{id}:
 *   get:
 *     summary: Get exam schedule by ID
 *     tags: [Exam Schedules]
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
 *         description: Exam schedule details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Exam schedule not found
 */
router.get('/:id', checkPermission(PERMISSIONS.READ, RESOURCES.ACADEMIC_RECORDS), validateExamScheduleId, examScheduleController.getExamScheduleById);

/**
 * @swagger
 * /api/exam-schedules/{id}:
 *   put:
 *     summary: Update exam schedule
 *     tags: [Exam Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExamScheduleCreate'
 *     responses:
 *       200:
 *         description: Exam schedule updated
 *       400:
 *         description: Invalid input or schedule conflict
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Exam schedule not found
 */
router.put('/:id', checkPermission(PERMISSIONS.EDIT, RESOURCES.ACADEMIC_RECORDS), validateExamScheduleId, validateExamScheduleCreate, examScheduleController.updateExamSchedule);

/**
 * @swagger
 * /api/exam-schedules/{id}:
 *   delete:
 *     summary: Delete exam schedule
 *     tags: [Exam Schedules]
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
 *         description: Exam schedule deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Exam schedule not found
 */
router.delete('/:id', checkPermission(PERMISSIONS.DELETE, RESOURCES.ACADEMIC_RECORDS), validateExamScheduleId, examScheduleController.deleteExamSchedule);

/**
 * @swagger
 * /api/exam-schedules/student/{studentId}/upcoming:
 *   get:
 *     summary: Get upcoming exams for student
 *     tags: [Exam Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of upcoming exams
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Student not found
 */
router.get('/student/:studentId/upcoming', validateStudentParam, examScheduleController.getStudentUpcomingExams);

/**
 * @swagger
 * /api/exam-schedules/date-range:
 *   get:
 *     summary: Get exams by date range
 *     tags: [Exam Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of exams in date range
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/exam-schedules/auto-generate:
 *   post:
 *     summary: Auto-generate exam schedule
 *     tags: [Exam Schedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grade
 *               - section
 *               - academicYear
 *               - semester
 *               - examType
 *               - startDate
 *               - endDate
 *             properties:
 *               grade:
 *                 type: number
 *               section:
 *                 type: string
 *               academicYear:
 *                 type: string
 *               semester:
 *                 type: string
 *               examType:
 *                 type: string
 *                 enum: [Midterm, Final]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Exam schedule auto-generated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /api/exam-schedules/regenerate:
 *   post:
 *     summary: Regenerate/Optimize exam schedule
 *     tags: [Exam Schedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grade
 *               - section
 *               - academicYear
 *               - semester
 *               - examType
 *               - startDate
 *               - endDate
 *             properties:
 *               grade:
 *                 type: number
 *               section:
 *                 type: string
 *               academicYear:
 *                 type: string
 *               semester:
 *                 type: string
 *               examType:
 *                 type: string
 *                 enum: [Midterm, Final]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Exam schedule regenerated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
module.exports = router;
