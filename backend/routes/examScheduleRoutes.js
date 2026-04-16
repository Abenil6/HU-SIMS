const express = require('express');
const router = express.Router();
const examScheduleController = require('../controllers/examScheduleController');
const { protect, authorize, checkPermission, PERMISSIONS, RESOURCES } = require('../middleware/authMiddleware');

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
router.get('/', checkPermission(PERMISSIONS.READ, RESOURCES.ACADEMIC_RECORDS), examScheduleController.getExamSchedules);

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
router.post('/', checkPermission(PERMISSIONS.WRITE, RESOURCES.ACADEMIC_RECORDS), examScheduleController.createExamSchedule);

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
router.get('/:id', checkPermission(PERMISSIONS.READ, RESOURCES.ACADEMIC_RECORDS), examScheduleController.getExamScheduleById);

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
router.put('/:id', checkPermission(PERMISSIONS.EDIT, RESOURCES.ACADEMIC_RECORDS), examScheduleController.updateExamSchedule);

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
router.delete('/:id', checkPermission(PERMISSIONS.DELETE, RESOURCES.ACADEMIC_RECORDS), examScheduleController.deleteExamSchedule);

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
router.get('/student/:studentId/upcoming', examScheduleController.getStudentUpcomingExams);

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
router.get('/date-range', examScheduleController.getExamsByDateRange);

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
router.post('/auto-generate', checkPermission(PERMISSIONS.WRITE, RESOURCES.ACADEMIC_RECORDS), examScheduleController.autoGenerateSchedule);

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
router.post('/regenerate', checkPermission(PERMISSIONS.WRITE, RESOURCES.ACADEMIC_RECORDS), examScheduleController.regenerateSchedule);

module.exports = router;
