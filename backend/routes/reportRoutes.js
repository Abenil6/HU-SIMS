const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize, checkPermission, PERMISSIONS, RESOURCES } = require('../middleware/authMiddleware');

router.use(protect);

/**
 * @swagger
 * components:
 *   schemas:
 *     TranscriptRequest:
 *       type: object
 *       required:
 *         - studentId
 *         - academicYear
 *         - semester
 *       properties:
 *         studentId:
 *           type: string
 *           description: Student ID
 *         academicYear:
 *           type: string
 *           example: "2025-2026"
 *         semester:
 *           type: string
 *           enum: ["Semester 1", "Semester 2"]
 *     ClassReportRequest:
 *       type: object
 *       required:
 *         - class
 *         - academicYear
 *         - semester
 *       properties:
 *         class:
 *           type: string
 *           example: "Grade 10"
 *         academicYear:
 *           type: string
 *         semester:
 *           type: string
 *           enum: ["Semester 1", "Semester 2"]
 */

router.use(protect);

/**
 * @swagger
 * /api/reports/transcript:
 *   post:
 *     summary: Generate student transcript
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TranscriptRequest'
 *     responses:
 *       201:
 *         description: Transcript generated
 */
router.post('/transcript', checkPermission(PERMISSIONS.WRITE, RESOURCES.REPORTS), reportController.generateStudentTranscript);

/**
 * @swagger
 * /api/reports/report-card:
 *   post:
 *     summary: Generate student report card
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Report card generated
 */
router.post('/report-card', checkPermission(PERMISSIONS.WRITE, RESOURCES.REPORTS), reportController.generateStudentReportCard);

/**
 * @swagger
 * /api/reports/class-progress:
 *   post:
 *     summary: Generate class progress report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClassReportRequest'
 *     responses:
 *       201:
 *         description: Class report generated
 */
router.post('/class-progress', checkPermission(PERMISSIONS.WRITE, RESOURCES.REPORTS), reportController.generateClassProgressReport);

router.post('/academic-performance', checkPermission(PERMISSIONS.WRITE, RESOURCES.REPORTS), reportController.generateAcademicPerformanceReport);

/**
 * @swagger
 * /api/reports/attendance-summary:
 *   post:
 *     summary: Generate attendance summary report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: string
 *               academicYear:
 *                 type: string
 *               month:
 *                 type: string
 *                 example: "01"
 *     responses:
 *       201:
 *         description: Attendance summary generated
 */
router.post('/attendance-summary', checkPermission(PERMISSIONS.WRITE, RESOURCES.REPORTS), reportController.generateAttendanceSummary);

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get all reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reports
 */
router.get('/', checkPermission(PERMISSIONS.READ, RESOURCES.REPORTS), reportController.getReports);

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get report by ID
 *     tags: [Reports]
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
 *         description: Report details
 */
router.get('/:id', checkPermission(PERMISSIONS.READ, RESOURCES.REPORTS), reportController.getReportById);

/**
 * @swagger
 * /api/reports/{id}/export:
 *   get:
 *     summary: Export report (JSON format)
 *     tags: [Reports]
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
 *         description: Report data for export
 */
router.get('/:id/export', checkPermission(PERMISSIONS.READ, RESOURCES.REPORTS), reportController.exportReport);

/**
 * @swagger
 * /api/reports/{id}/official:
 *   post:
 *     summary: Mark report as official (Admin)
 *     tags: [Reports]
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
 *             type: object
 *             properties:
 *               signedBy:
 *                 type: string
 *               signatureDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Report officialized
 */
router.post('/:id/official', authorize('SchoolAdmin'), reportController.officializeReport);

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: Delete report
 *     tags: [Reports]
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
 *         description: Report deleted
 */
router.delete('/:id', checkPermission(PERMISSIONS.DELETE, RESOURCES.REPORTS), reportController.deleteReport);

/**
 * @swagger
 * /api/reports/{id}/archive:
 *   post:
 *     summary: Archive report
 *     tags: [Reports]
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
 *         description: Report archived
 */
router.post('/:id/archive', checkPermission(PERMISSIONS.WRITE, RESOURCES.REPORTS), reportController.archiveReport);

/**
 * @swagger
 * /api/reports/{id}/revert:
 *   post:
 *     summary: Revert report to draft
 *     tags: [Reports]
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
 *         description: Report reverted to draft
 */
router.post('/:id/revert', checkPermission(PERMISSIONS.EDIT, RESOURCES.REPORTS), reportController.revertToDraft);

module.exports = router;
